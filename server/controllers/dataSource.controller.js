const fs = require('fs');
const path = require('path');
const prisma = require('../config/prisma');
const { ApiError } = require('../middleware/errorHandler');
const { encrypt, decrypt } = require('../utils/crypto');
const dataSourceService = require('../services/dataSource.service');
const fileImportService = require('../services/fileImport.service');

const EXTENSION_TYPE_MAP = {
  '.csv': 'CSV',
  '.xlsx': 'EXCEL',
  '.xls': 'EXCEL',
  '.sqlite': 'SQLITE',
  '.db': 'SQLITE',
};

/** Fields safe to send to the client — never the encrypted connectionInfo blob. */
const PUBLIC_SELECT = {
  id: true,
  name: true,
  type: true,
  status: true,
  schemaCache: true,
  lastConnectedAt: true,
  createdAt: true,
  updatedAt: true,
};

async function findOwnedOrThrow(id, ownerId) {
  const dataSource = await prisma.dataSource.findUnique({ where: { id } });
  if (!dataSource || dataSource.ownerId !== ownerId) {
    throw new ApiError(404, 'Data source not found.');
  }
  return dataSource;
}

async function createConnection(req, res, next) {
  try {
    const { name, type, connectionInfo } = req.body;

    if (!['POSTGRES', 'MYSQL'].includes(type)) {
      throw new ApiError(400, 'type must be POSTGRES or MYSQL for a live connection.');
    }
    if (!name || !connectionInfo?.host || !connectionInfo?.database || !connectionInfo?.user) {
      throw new ApiError(400, 'name, and connectionInfo.{host, database, user} are required.');
    }

    const schemaCache = await dataSourceService.testAndIntrospect(type, connectionInfo);

    const dataSource = await prisma.dataSource.create({
      data: {
        name,
        type,
        status: 'CONNECTED',
        connectionInfo: encrypt(connectionInfo),
        schemaCache,
        lastConnectedAt: new Date(),
        ownerId: req.user.id,
      },
      select: PUBLIC_SELECT,
    });

    res.status(201).json({ success: true, data: dataSource });
  } catch (err) {
    next(err);
  }
}

async function uploadFile(req, res, next) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No file uploaded.');
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const type = EXTENSION_TYPE_MAP[ext];
    let imported;

    try {
      if (ext === '.csv') {
        imported = fileImportService.importCsv(req.file.path, req.file.originalname);
      } else if (ext === '.xlsx' || ext === '.xls') {
        imported = await fileImportService.importExcel(req.file.path);
      } else {
        imported = fileImportService.importSqliteFile(req.file.path);
      }
    } finally {
      fs.unlink(req.file.path, () => {});
    }

    const dataSource = await prisma.dataSource.create({
      data: {
        name: req.body.name || path.parse(req.file.originalname).name,
        type,
        status: 'CONNECTED',
        filePath: imported.filePath,
        schemaCache: imported.schemaCache,
        lastConnectedAt: new Date(),
        ownerId: req.user.id,
      },
      select: PUBLIC_SELECT,
    });

    res.status(201).json({
      success: true,
      data: { ...dataSource, previewRows: imported.previewRows, rowCount: imported.rowCount },
    });
  } catch (err) {
    next(err);
  }
}

async function list(req, res, next) {
  try {
    const dataSources = await prisma.dataSource.findMany({
      where: { ownerId: req.user.id },
      select: PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: dataSources });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const dataSource = await findOwnedOrThrow(req.params.id, req.user.id);
    const { connectionInfo, filePath, ...publicFields } = dataSource;
    res.json({ success: true, data: publicFields });
  } catch (err) {
    next(err);
  }
}

async function preview(req, res, next) {
  try {
    const dataSource = await findOwnedOrThrow(req.params.id, req.user.id);
    const tables = dataSource.schemaCache || [];
    if (tables.length === 0) {
      throw new ApiError(400, 'This data source has no tables to preview.');
    }

    const requestedTable = req.query.table;
    const table = requestedTable
      ? tables.find((t) => t.name === requestedTable)
      : tables[0];
    if (!table) {
      throw new ApiError(404, `Table "${requestedTable}" not found on this data source.`);
    }

    const result = await dataSourceService.runQuery(
      dataSource,
      `SELECT * FROM "${table.name}" LIMIT 20`
    );
    res.json({ success: true, data: { table: table.name, ...result } });
  } catch (err) {
    next(err);
  }
}

async function testExisting(req, res, next) {
  try {
    const dataSource = await findOwnedOrThrow(req.params.id, req.user.id);

    if (!['POSTGRES', 'MYSQL'].includes(dataSource.type)) {
      throw new ApiError(400, 'Only live database connections can be re-tested.');
    }

    const connectionInfo = decrypt(dataSource.connectionInfo);

    let schemaCache;
    let status = 'CONNECTED';
    try {
      schemaCache = await dataSourceService.testAndIntrospect(dataSource.type, connectionInfo);
    } catch (err) {
      status = 'ERROR';
      await prisma.dataSource.update({ where: { id: dataSource.id }, data: { status } });
      throw err;
    }

    const updated = await prisma.dataSource.update({
      where: { id: dataSource.id },
      data: { status, schemaCache, lastConnectedAt: new Date() },
      select: PUBLIC_SELECT,
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const dataSource = await findOwnedOrThrow(req.params.id, req.user.id);

    await prisma.dataSource.delete({ where: { id: dataSource.id } });

    if (dataSource.filePath) {
      fs.unlink(dataSource.filePath, () => {});
    }

    res.json({ success: true, message: 'Data source deleted.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { createConnection, uploadFile, list, getOne, preview, testExisting, remove };

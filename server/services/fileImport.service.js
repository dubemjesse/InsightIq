const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { parse } = require('csv-parse/sync');
const ExcelJS = require('exceljs');
const { DatabaseSync } = require('node:sqlite');
const env = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');

const PREVIEW_ROW_LIMIT = 20;

function sanitizeIdentifier(raw, fallback) {
  const cleaned = String(raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1');
  return cleaned || fallback;
}

function inferColumnType(values) {
  const nonEmpty = values.filter((v) => v !== null && v !== undefined && v !== '');
  if (nonEmpty.length === 0) return 'TEXT';

  const allIntegers = nonEmpty.every((v) => /^-?\d+$/.test(String(v).trim()));
  if (allIntegers) return 'INTEGER';

  const allNumeric = nonEmpty.every((v) => !Number.isNaN(Number(String(v).trim())) && String(v).trim() !== '');
  if (allNumeric) return 'REAL';

  return 'TEXT';
}

function newSqlitePath() {
  fs.mkdirSync(env.uploads.dir, { recursive: true });
  return path.join(env.uploads.dir, `${crypto.randomUUID()}.sqlite`);
}

/** Writes `rows` (array of objects, same keys) into a fresh table in a new SQLite file. */
function materializeTable(db, tableName, rows) {
  const columnNames = Object.keys(rows[0] ?? {}).map((name, i) =>
    sanitizeIdentifier(name, `column_${i + 1}`)
  );
  const originalKeys = Object.keys(rows[0] ?? {});
  const columnTypes = columnNames.map((_, i) =>
    inferColumnType(rows.map((r) => r[originalKeys[i]]))
  );

  const columnDefs = columnNames.map((name, i) => `"${name}" ${columnTypes[i]}`).join(', ');
  db.exec(`CREATE TABLE "${tableName}" (${columnDefs})`);

  const placeholders = columnNames.map(() => '?').join(', ');
  const insertStmt = db.prepare(
    `INSERT INTO "${tableName}" (${columnNames.map((n) => `"${n}"`).join(', ')}) VALUES (${placeholders})`
  );

  db.exec('BEGIN');
  try {
    for (const row of rows) {
      insertStmt.run(...originalKeys.map((k) => row[k] ?? null));
    }
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    name: tableName,
    columns: columnNames.map((name, i) => ({ name, type: columnTypes[i] })),
  };
}

/** Parses an uploaded CSV file into a new SQLite-backed data source. */
function importCsv(uploadedFilePath, originalName) {
  const content = fs.readFileSync(uploadedFilePath, 'utf8');
  const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

  if (records.length === 0) {
    throw new ApiError(400, 'The CSV file has no data rows.');
  }

  const tableName = sanitizeIdentifier(path.parse(originalName).name, 'data');
  const sqlitePath = newSqlitePath();
  const db = new DatabaseSync(sqlitePath);
  let table;
  try {
    table = materializeTable(db, tableName, records);
  } finally {
    db.close();
  }

  return {
    filePath: sqlitePath,
    schemaCache: [table],
    previewRows: records.slice(0, PREVIEW_ROW_LIMIT),
    rowCount: records.length,
  };
}

/** Parses an uploaded Excel workbook (each non-empty sheet -> one table) into a new SQLite file. */
async function importExcel(uploadedFilePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(uploadedFilePath);

  const sqlitePath = newSqlitePath();
  const db = new DatabaseSync(sqlitePath);
  const tables = [];
  let firstSheetPreview = [];
  let totalRows = 0;

  try {
    let sheetIndex = 0;
    for (const worksheet of workbook.worksheets) {
      if (worksheet.rowCount < 2) continue; // header only / empty sheet

      const [headerRow, ...dataRows] = worksheet.getRows(1, worksheet.rowCount);
      const headers = headerRow.values.slice(1).map((h, i) => String(h ?? `column_${i + 1}`));

      const records = dataRows.map((row) => {
        const values = row.values.slice(1);
        const record = {};
        headers.forEach((header, i) => {
          const cell = values[i];
          record[header] = cell instanceof Date ? cell.toISOString() : cell ?? null;
        });
        return record;
      });

      if (records.length === 0) continue;

      sheetIndex += 1;
      const tableName = sanitizeIdentifier(worksheet.name, `sheet_${sheetIndex}`);
      tables.push(materializeTable(db, tableName, records));
      totalRows += records.length;
      if (sheetIndex === 1) firstSheetPreview = records.slice(0, PREVIEW_ROW_LIMIT);
    }
  } finally {
    db.close();
  }

  if (tables.length === 0) {
    fs.unlinkSync(sqlitePath);
    throw new ApiError(400, 'The workbook has no sheets with data rows.');
  }

  return {
    filePath: sqlitePath,
    schemaCache: tables,
    previewRows: firstSheetPreview,
    rowCount: totalRows,
  };
}

/** Copies an uploaded SQLite/DB file into the uploads dir and introspects it as-is. */
function importSqliteFile(uploadedFilePath) {
  const { introspectSqlite } = require('./dataSource.service');
  const destPath = newSqlitePath();
  fs.copyFileSync(uploadedFilePath, destPath);

  const schemaCache = introspectSqlite(destPath);
  if (schemaCache.length === 0) {
    fs.unlinkSync(destPath);
    throw new ApiError(400, 'The SQLite file has no tables.');
  }

  const db = new DatabaseSync(destPath, { readOnly: true });
  let previewRows = [];
  try {
    previewRows = db
      .prepare(`SELECT * FROM "${schemaCache[0].name}" LIMIT ${PREVIEW_ROW_LIMIT}`)
      .all();
  } finally {
    db.close();
  }

  return { filePath: destPath, schemaCache, previewRows, rowCount: null };
}

module.exports = { importCsv, importExcel, importSqliteFile };

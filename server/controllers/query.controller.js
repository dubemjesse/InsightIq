const prisma = require('../config/prisma');
const { ApiError } = require('../middleware/errorHandler');
const aiAgent = require('../services/aiAgent');
const dataSourceService = require('../services/dataSource.service');

async function ask(req, res, next) {
  try {
    const { dataSourceId, question } = req.body;

    const dataSource = await prisma.dataSource.findUnique({ where: { id: dataSourceId } });
    if (!dataSource || dataSource.ownerId !== req.user.id) {
      throw new ApiError(404, 'Data source not found.');
    }
    if (!dataSource.schemaCache || dataSource.schemaCache.length === 0) {
      throw new ApiError(400, 'This data source has no tables to query.');
    }

    const { sql, explanation } = await aiAgent.generateSql({ dataSource, question });

    let result;
    try {
      result = await dataSourceService.runQuery(dataSource, sql);
    } catch (err) {
      throw new ApiError(400, `The generated query failed to run: ${err.message}`, { sql });
    }

    const savedQuery = await prisma.savedQuery.create({
      data: {
        question,
        generatedSql: sql,
        resultPreview: result.rows.slice(0, 20),
        ownerId: req.user.id,
        dataSourceId: dataSource.id,
      },
    });

    res.json({
      success: true,
      data: {
        savedQueryId: savedQuery.id,
        question,
        sql,
        explanation,
        columns: result.columns,
        rows: result.rows,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { ask };

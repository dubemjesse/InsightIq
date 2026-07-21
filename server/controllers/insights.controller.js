const prisma = require('../config/prisma');
const { ApiError } = require('../middleware/errorHandler');
const insightsEngine = require('../services/insightsEngine');
const emailService = require('../services/emailService');

async function list(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const insights = await prisma.insight.findMany({
      where: {
        dataSource: { ownerId: req.user.id },
        ...(req.query.dataSourceId && { dataSourceId: req.query.dataSourceId }),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { dataSource: { select: { id: true, name: true } } },
    });
    res.json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
}

async function scanOne(req, res, next) {
  try {
    const dataSource = await prisma.dataSource.findUnique({ where: { id: req.params.dataSourceId } });
    if (!dataSource || dataSource.ownerId !== req.user.id) {
      throw new ApiError(404, 'Data source not found.');
    }

    const insights = await insightsEngine.scanDataSource(dataSource);
    res.status(201).json({ success: true, data: insights });
  } catch (err) {
    next(err);
  }
}

async function scanAll(req, res, next) {
  try {
    const insights = await insightsEngine.scanAllForUser(req.user.id);
    if (insights.length > 0) {
      await emailService.sendInsightsDigest(req.user, insights);
    }
    res.status(201).json({
      success: true,
      data: insights,
      emailSent: insights.length > 0 && emailService.isConfigured(),
    });
  } catch (err) {
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const insight = await prisma.insight.findUnique({
      where: { id: req.params.id },
      include: { dataSource: true },
    });
    if (!insight || insight.dataSource.ownerId !== req.user.id) {
      throw new ApiError(404, 'Insight not found.');
    }
    await prisma.insight.delete({ where: { id: insight.id } });
    res.json({ success: true, message: 'Insight dismissed.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, scanOne, scanAll, remove };

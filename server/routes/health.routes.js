const express = require('express');
const prisma = require('../config/prisma');

const router = express.Router();

router.get('/', async (req, res) => {
  let dbStatus = 'unknown';
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = 'connected';
  } catch {
    dbStatus = 'unavailable';
  }

  res.json({
    success: true,
    service: 'insightiq-server',
    status: 'ok',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

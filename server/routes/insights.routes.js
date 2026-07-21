const express = require('express');
const rateLimit = require('express-rate-limit');
const { protect, requireRole } = require('../middleware/auth.middleware');
const { list, scanOne, scanAll, remove } = require('../controllers/insights.controller');

const router = express.Router();

// Scans run AI narration calls — keep them rate-limited like /query/ask.
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many scans requested recently. Please wait a bit and try again.' },
});

router.use(protect);

router.get('/', list);
router.post('/scan-all', requireRole('ADMIN', 'ANALYST'), scanLimiter, scanAll);
router.post('/scan/:dataSourceId', requireRole('ADMIN', 'ANALYST'), scanLimiter, scanOne);
router.delete('/:id', remove);

module.exports = router;

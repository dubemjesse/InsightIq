const express = require('express');
const { body } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth.middleware');
const { ask } = require('../controllers/query.controller');

const router = express.Router();

// AI calls cost money and take a few seconds — keep this tighter than the
// general API rate limit.
const askLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many questions asked recently. Please wait a bit and try again.' },
});

router.use(protect);

router.post(
  '/ask',
  askLimiter,
  [
    body('dataSourceId').trim().notEmpty().withMessage('dataSourceId is required.'),
    body('question').trim().isLength({ min: 3, max: 1000 }).withMessage('question must be between 3 and 1000 characters.'),
  ],
  validate,
  ask
);

module.exports = router;

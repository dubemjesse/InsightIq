const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth.middleware');
const {
  create,
  list,
  getOne,
  update,
  remove,
  addWidget,
  updateWidget,
  bulkUpdateLayout,
  removeWidget,
  getWidgetData,
} = require('../controllers/dashboard.controller');

const router = express.Router();

router.use(protect);

router.get('/', list);
router.post(
  '/',
  [body('name').trim().notEmpty().withMessage('Name is required.')],
  validate,
  create
);

router.get('/:id', getOne);
router.patch('/:id', update);
router.delete('/:id', remove);

router.post(
  '/:id/widgets',
  [
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('type').isIn(['BAR', 'LINE', 'PIE', 'AREA', 'TABLE']).withMessage('Invalid widget type.'),
    body('config.dataSourceId').notEmpty().withMessage('config.dataSourceId is required.'),
    body('config.sql').notEmpty().withMessage('config.sql is required.'),
  ],
  validate,
  addWidget
);
router.patch('/:id/widgets/:widgetId', updateWidget);
router.delete('/:id/widgets/:widgetId', removeWidget);
router.get('/:id/widgets/:widgetId/data', getWidgetData);

router.patch(
  '/:id/layout',
  [body('widgets').isArray().withMessage('widgets must be an array.')],
  validate,
  bulkUpdateLayout
);

module.exports = router;

const express = require('express');
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect, requireRole } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const {
  createConnection,
  uploadFile,
  list,
  getOne,
  preview,
  testExisting,
  remove,
} = require('../controllers/dataSource.controller');

const router = express.Router();

// Viewers can browse/preview data sources; only Admins and Analysts can
// create, upload, re-test, or delete connections.
const canManage = requireRole('ADMIN', 'ANALYST');

router.use(protect);

router.get('/', list);
router.get('/:id', getOne);
router.get('/:id/preview', preview);

router.post(
  '/connect',
  canManage,
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('type').isIn(['POSTGRES', 'MYSQL']).withMessage('type must be POSTGRES or MYSQL.'),
    body('connectionInfo.host').notEmpty().withMessage('Host is required.'),
    body('connectionInfo.database').notEmpty().withMessage('Database name is required.'),
    body('connectionInfo.user').notEmpty().withMessage('User is required.'),
  ],
  validate,
  createConnection
);

router.post('/upload', canManage, upload.single('file'), uploadFile);
router.post('/:id/test', canManage, testExisting);
router.delete('/:id', canManage, remove);

module.exports = router;

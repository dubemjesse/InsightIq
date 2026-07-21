const express = require('express');
const { protect, requireRole } = require('../middleware/auth.middleware');
const {
  listUsers,
  updateUser,
  deleteUser,
  listAllDataSources,
  stats,
} = require('../controllers/admin.controller');

const router = express.Router();

router.use(protect, requireRole('ADMIN'));

router.get('/stats', stats);
router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/data-sources', listAllDataSources);

module.exports = router;

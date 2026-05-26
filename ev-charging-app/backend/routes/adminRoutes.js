const express = require('express');
const router = express.Router();
const {
  getUsers,
  toggleBlockUser,
  deleteUser,
  getUserActivity,
  getAdminAnalytics,
  getReports,
  resolveReport,
  createReport,
  getSearchAnalytics,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');
const { adminLimiter } = require('../middleware/rateLimiter');

const admin = [protect, authorize('admin')];

// Apply admin-specific rate limit to all admin routes
router.use(adminLimiter);

// Analytics
router.get('/analytics', ...admin, getAdminAnalytics);
router.get('/analytics/search', ...admin, getSearchAnalytics);

// User management
router.get('/users', ...admin, getUsers);
router.get('/users/:id/activity', ...admin, getUserActivity);
router.patch('/users/:id/block', ...admin, toggleBlockUser);
router.delete('/users/:id', ...admin, deleteUser);

// Reports / feedback
router.get('/reports', ...admin, getReports);
router.post('/reports', protect, createReport);
router.patch('/reports/:id/resolve', ...admin, resolveReport);

module.exports = router;

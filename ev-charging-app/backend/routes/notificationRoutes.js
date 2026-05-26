const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/auth');
const { objectIdValidation, validate } = require('../middleware/validation');

router.get('/', protect, getNotifications);
router.put('/read-all', protect, markAllAsRead);
router.put('/:id/read', protect, objectIdValidation(), validate, markAsRead);
router.delete('/:id', protect, objectIdValidation(), validate, deleteNotification);

// Admin: Create notification for a user
router.post('/', protect, authorize('admin'), createNotification);

module.exports = router;

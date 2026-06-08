const express = require('express');
const router = express.Router();
const {
  registerHost,
  getHostStatus,
  uploadPhotos,
  deletePhoto,
  updateHostProfile,
  getHostListing,
  getHostDashboard,
  adminListHosts,
  adminApproveHost,
  adminRejectHost,
} = require('../controllers/hostController');
const { protect, authorize } = require('../middleware/auth');

// Public
router.get('/:id/listing', getHostListing);

// Authenticated users
router.use(protect);
router.post('/register',    registerHost);
router.get('/status',       getHostStatus);
router.get('/dashboard',    getHostDashboard);
router.put('/profile',      updateHostProfile);
router.post('/photos',      uploadPhotos);
router.delete('/photos',    deletePhoto);

// Admin only
router.get('/admin/all',            authorize('admin'), adminListHosts);
router.put('/admin/:id/approve',    authorize('admin'), adminApproveHost);
router.put('/admin/:id/reject',     authorize('admin'), adminRejectHost);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  getStations,
  getNearbyStations,
  getReachableStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
  getStationAnalytics,
  updateAvailability,
  verifyStation,
  bulkImport,

} = require('../controllers/stationController');
const { protect, authorize } = require('../middleware/auth');
const {
  stationValidation,
  objectIdValidation,
  validate,
} = require('../middleware/validation');
const { stationLimiter } = require('../middleware/rateLimiter');

// Apply station-specific rate limit to all station routes
router.use(stationLimiter);

// Public routes
router.get('/', getStations);
router.get('/nearby', getNearbyStations);
router.get('/reachable', getReachableStations);

// Admin routes
router.get('/analytics/overview', protect, authorize('admin'), getStationAnalytics);
router.post('/bulk-import', protect, authorize('admin'), bulkImport);

// Parameterized routes
router.get('/:id', objectIdValidation(), validate, getStation);
router.post('/', protect, authorize('admin'), stationValidation, validate, createStation);
router.put('/:id', protect, authorize('admin'), objectIdValidation(), validate, updateStation);
router.delete('/:id', protect, authorize('admin'), objectIdValidation(), validate, deleteStation);
router.patch('/:id/availability', protect, authorize('admin'), updateAvailability);
router.patch('/:id/verify', protect, authorize('admin'), verifyStation);

module.exports = router;

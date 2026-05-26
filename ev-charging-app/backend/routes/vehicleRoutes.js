const express = require('express');
const router = express.Router();
const {
  getVehicles,
  getVehicle,
  getCompatibleStations,
  getVehicleMakes,
  createVehicle,
  updateVehicle,
} = require('../controllers/vehicleController');
const { protect, authorize } = require('../middleware/auth');
const { objectIdValidation, validate } = require('../middleware/validation');

router.get('/', getVehicles);
router.get('/makes', getVehicleMakes);
router.get('/:id', objectIdValidation(), validate, getVehicle);
router.get('/:id/compatible-stations', objectIdValidation(), validate, getCompatibleStations);

// Admin routes
router.post('/', protect, authorize('admin'), createVehicle);
router.put('/:id', protect, authorize('admin'), objectIdValidation(), validate, updateVehicle);

module.exports = router;

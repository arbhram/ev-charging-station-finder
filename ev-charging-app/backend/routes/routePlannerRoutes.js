const express = require('express');
const router = express.Router();
const {
  planRoute,
  saveRoute,
  getUserRoutes,
  deleteRoute,
} = require('../controllers/routeController');
const { protect } = require('../middleware/auth');
const { objectIdValidation, validate } = require('../middleware/validation');

// Public route planning
router.post('/plan', planRoute);

// Private routes
router.get('/', protect, getUserRoutes);
router.post('/', protect, saveRoute);
router.delete('/:id', protect, objectIdValidation(), validate, deleteRoute);

module.exports = router;

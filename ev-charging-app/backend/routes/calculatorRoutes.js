const express = require('express');
const router = express.Router();
const {
  calculateCharge,
  compareChargers,
} = require('../controllers/calculatorController');
const { calculationValidation, validate } = require('../middleware/validation');

router.post('/charge', calculationValidation, validate, calculateCharge);
router.post('/compare', compareChargers);

module.exports = router;

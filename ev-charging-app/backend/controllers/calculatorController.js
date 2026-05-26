const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const {
  calculateChargingTime,
  calculateChargingCost,
  calculateEnergyRequired,
} = require('../utils/calculations');

/**
 * @desc    Calculate charging time, cost, and energy
 * @route   POST /api/calculator/charge
 * @access  Public
 */
const calculateCharge = asyncHandler(async (req, res) => {
  const {
    batteryCapacity,
    currentPercent,
    targetPercent,
    chargerLevel,
    customPowerKW,
    pricing,
  } = req.body;

  if (targetPercent <= currentPercent) {
    throw ApiError.badRequest(
      'Target battery percentage must be greater than current percentage'
    );
  }

  // Calculate charging time
  const chargingTime = calculateChargingTime(
    batteryCapacity,
    currentPercent,
    targetPercent,
    chargerLevel,
    customPowerKW || null
  );

  // Calculate cost if pricing provided
  let chargingCost = null;
  if (pricing) {
    chargingCost = calculateChargingCost(
      chargingTime.energyKWh,
      pricing,
      chargingTime.timeMinutes
    );
  }

  // Calculate energy required
  const energyRequired = calculateEnergyRequired(
    batteryCapacity,
    currentPercent,
    targetPercent
  );

  res.status(200).json({
    success: true,
    data: {
      input: {
        batteryCapacity,
        currentPercent,
        targetPercent,
        chargerLevel,
        powerKW: customPowerKW || undefined,
      },
      result: {
        energyRequired: Math.round(energyRequired * 100) / 100,
        chargingTime: chargingTime.timeFormatted,
        chargingTimeMinutes: chargingTime.timeMinutes,
        ...(chargingCost && {
          cost: chargingCost.totalCost,
          costBreakdown: chargingCost.breakdown,
          currency: chargingCost.currency,
        }),
      },
    },
  });
});

/**
 * @desc    Compare charging options across different charger levels
 * @route   POST /api/calculator/compare
 * @access  Public
 */
const compareChargers = asyncHandler(async (req, res) => {
  const { batteryCapacity, currentPercent, targetPercent } = req.body;

  if (targetPercent <= currentPercent) {
    throw ApiError.badRequest(
      'Target battery percentage must be greater than current percentage'
    );
  }

  const levels = ['Level 1', 'Level 2', 'DC Fast Charger'];
  const comparisons = levels.map((level) => {
    const result = calculateChargingTime(
      batteryCapacity,
      currentPercent,
      targetPercent,
      level
    );
    return {
      chargerLevel: level,
      chargingTime: result.timeFormatted,
      chargingTimeMinutes: result.timeMinutes,
      energyKWh: result.energyKWh,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      input: { batteryCapacity, currentPercent, targetPercent },
      comparisons,
    },
  });
});

module.exports = {
  calculateCharge,
  compareChargers,
};

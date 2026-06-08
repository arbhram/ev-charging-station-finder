/**
 * EV Charging Calculation Utilities
 *
 * Contains core business logic for:
 * - Charging time estimation
 * - Charging cost calculation
 * - Range-based station reachability
 * - Energy consumption calculations
 */

/**
 * Charger power ratings by level (kW)
 */
const CHARGER_POWER = {
  'Level 1': 1.4,
  'Level 2': 7.2,
  'DC Fast Charger': 50,
};

/**
 * Default efficiency factor (accounts for charging losses ~10-15%)
 */
const CHARGING_EFFICIENCY = 0.9;

/**
 * Calculate energy required to charge from current to target percentage.
 *
 * @param {number} batteryCapacity - Total battery capacity in kWh
 * @param {number} currentPercent - Current battery percentage (0-100)
 * @param {number} targetPercent - Target battery percentage (0-100)
 * @returns {number} Energy required in kWh
 */
const calculateEnergyRequired = (batteryCapacity, currentPercent, targetPercent) => {
  if (currentPercent < 0 || currentPercent > 100) {
    throw new Error('Current battery percentage must be between 0 and 100');
  }
  if (targetPercent < 0 || targetPercent > 100) {
    throw new Error('Target battery percentage must be between 0 and 100');
  }
  if (targetPercent <= currentPercent) {
    return 0;
  }

  const percentNeeded = (targetPercent - currentPercent) / 100;
  return (batteryCapacity * percentNeeded) / CHARGING_EFFICIENCY;
};

/**
 * Calculate estimated charging time.
 *
 * @param {number} batteryCapacity - Battery capacity in kWh
 * @param {number} currentPercent - Current battery percentage
 * @param {number} targetPercent - Target battery percentage
 * @param {string} chargerLevel - 'Level 1', 'Level 2', or 'DC Fast Charger'
 * @param {number} [customPowerKW] - Optional custom charger power in kW
 * @returns {object} { timeMinutes, timeFormatted, energyKWh }
 */
const calculateChargingTime = (
  batteryCapacity,
  currentPercent,
  targetPercent,
  chargerLevel,
  customPowerKW = null
) => {
  const energyKWh = calculateEnergyRequired(
    batteryCapacity,
    currentPercent,
    targetPercent
  );

  const powerKW = customPowerKW || CHARGER_POWER[chargerLevel];
  if (!powerKW) {
    throw new Error(`Unknown charger level: ${chargerLevel}`);
  }

  const timeHours = energyKWh / powerKW;
  const timeMinutes = Math.round(timeHours * 60);

  const hours = Math.floor(timeMinutes / 60);
  const minutes = timeMinutes % 60;
  const hLabel = hours === 1 ? 'hr' : 'hrs';
  const timeFormatted = hours > 0
    ? (minutes === 0 ? `${hours} ${hLabel}` : `${hours} ${hLabel} ${minutes} min`)
    : `${timeMinutes} min`;

  return {
    timeMinutes,
    timeFormatted,
    energyKWh: Math.round(energyKWh * 100) / 100,
  };
};

/**
 * Calculate estimated charging cost.
 *
 * @param {number} energyKWh - Energy required in kWh
 * @param {object} pricing - { perKWh, perMinute, flatRate, isFree }
 * @param {number} [chargingTimeMinutes] - Charging time for per-minute pricing
 * @returns {object} { totalCost, breakdown }
 */
const calculateChargingCost = (energyKWh, pricing, chargingTimeMinutes = 0) => {
  if (pricing.isFree) {
    return { totalCost: 0, breakdown: { type: 'free' }, currency: pricing.currency || 'NPR' };
  }

  let totalCost = 0;
  const breakdown = {};

  if (pricing.perKWh > 0) {
    const energyCost = energyKWh * pricing.perKWh;
    breakdown.energyCost = Math.round(energyCost * 100) / 100;
    totalCost += energyCost;
  }

  if (pricing.perMinute > 0 && chargingTimeMinutes > 0) {
    const timeCost = chargingTimeMinutes * pricing.perMinute;
    breakdown.timeCost = Math.round(timeCost * 100) / 100;
    totalCost += timeCost;
  }

  if (pricing.flatRate > 0) {
    breakdown.flatRate = pricing.flatRate;
    totalCost += pricing.flatRate;
  }

  return {
    totalCost: Math.round(totalCost * 100) / 100,
    breakdown,
    currency: pricing.currency || 'NPR',
  };
};

/**
 * Calculate reachable distance based on current battery.
 *
 * @param {number} currentBatteryPercent - Current battery percentage
 * @param {number} totalRange - Total vehicle range in km at 100%
 * @param {number} [safetyMargin] - Reserve percentage (default 10%)
 * @returns {object} { reachableDistance, safeDistance }
 */
const calculateReachableDistance = (
  currentBatteryPercent,
  totalRange,
  safetyMargin = 10
) => {
  const reachableDistance = (currentBatteryPercent / 100) * totalRange;
  const safeDistance =
    ((currentBatteryPercent - safetyMargin) / 100) * totalRange;

  return {
    reachableDistance: Math.round(reachableDistance * 10) / 10,
    safeDistance: Math.max(0, Math.round(safeDistance * 10) / 10),
  };
};

/**
 * Calculate Haversine distance between two geographic points.
 *
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Filter stations that are within reachable range.
 *
 * @param {Array} stations - Array of station objects with location.coordinates
 * @param {number} userLat - User's latitude
 * @param {number} userLon - User's longitude
 * @param {number} reachableDistanceKm - Maximum reachable distance
 * @returns {Array} Filtered and sorted stations with distance
 */
const filterReachableStations = (stations, userLat, userLon, reachableDistanceKm) => {
  return stations
    .map((station) => {
      const [stationLon, stationLat] = station.location.coordinates;
      const distance = haversineDistance(userLat, userLon, stationLat, stationLon);
      return {
        ...station.toObject ? station.toObject() : station,
        distance,
        isReachable: distance <= reachableDistanceKm,
      };
    })
    .filter((station) => station.isReachable)
    .sort((a, b) => a.distance - b.distance);
};

module.exports = {
  calculateEnergyRequired,
  calculateChargingTime,
  calculateChargingCost,
  calculateReachableDistance,
  haversineDistance,
  filterReachableStations,
  CHARGER_POWER,
  CHARGING_EFFICIENCY,
};

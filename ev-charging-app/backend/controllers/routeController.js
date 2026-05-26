const { Route, ChargingStation } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { notifyRoutePlanned } = require('../services/notificationService');
const {
  haversineDistance,
  calculateChargingTime,
  calculateChargingCost,
} = require('../utils/calculations');
const logger = require('../utils/logger');

/**
 * @desc    Plan a route with charging stops
 * @route   POST /api/routes/plan
 * @access  Public
 */
const planRoute = asyncHandler(async (req, res) => {
  const {
    origin,
    destination,
    vehicleRange,
    currentBattery,
    batteryCapacity,
    preferredChargerLevel,
  } = req.body;

  if (!origin || !destination) {
    throw ApiError.badRequest('Origin and destination are required');
  }

  // Calculate total route distance (straight line as fallback)
  const totalDistance = haversineDistance(
    origin.lat,
    origin.lng,
    destination.lat,
    destination.lng
  );

  // Calculate reachable distance with current battery
  const reachableKm = (currentBattery / 100) * vehicleRange;

  // If destination is within range, no charging stops needed
  if (totalDistance <= reachableKm * 0.85) {
    return res.status(200).json({
      success: true,
      data: {
        origin,
        destination,
        totalDistance,
        chargingStopsNeeded: false,
        chargingStops: [],
        message: 'Destination is within your current battery range!',
      },
    });
  }

  // Find charging stations along the route corridor
  // Use a bounding box between origin and destination with buffer
  const minLat = Math.min(origin.lat, destination.lat) - 0.5;
  const maxLat = Math.max(origin.lat, destination.lat) + 0.5;
  const minLng = Math.min(origin.lng, destination.lng) - 0.5;
  const maxLng = Math.max(origin.lng, destination.lng) + 0.5;

  const stationsAlongRoute = await ChargingStation.find({
    'location.coordinates': {
      $geoWithin: {
        $box: [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
      },
    },
    isActive: true,
    ...(preferredChargerLevel && { chargerLevel: preferredChargerLevel }),
  }).lean();

  // Score and select optimal charging stops
  const chargingStops = selectOptimalStops(
    stationsAlongRoute,
    origin,
    destination,
    vehicleRange,
    currentBattery,
    batteryCapacity
  );

  // Notify authenticated user their route is ready
  if (req.user) {
    notifyRoutePlanned(
      req.user.id,
      origin.name || `${origin.lat.toFixed(3)}, ${origin.lng.toFixed(3)}`,
      destination.name || `${destination.lat.toFixed(3)}, ${destination.lng.toFixed(3)}`,
      chargingStops.length
    ).catch(() => {});
  }

  res.status(200).json({
    success: true,
    data: {
      origin,
      destination,
      totalDistance,
      chargingStopsNeeded: true,
      chargingStops,
      totalChargingStops: chargingStops.length,
      message: `${chargingStops.length} charging stop(s) recommended`,
    },
  });
});

/**
 * Select optimal charging stops along a route.
 * Uses a greedy algorithm: drive as far as safely possible, then charge.
 */
function selectOptimalStops(
  stations,
  origin,
  destination,
  vehicleRange,
  currentBattery,
  batteryCapacity
) {
  const stops = [];
  let currentPosition = { lat: origin.lat, lng: origin.lng };
  let remainingBattery = currentBattery;
  const safeRangePercent = 15; // Keep 15% reserve

  // Add distance from origin to each station
  const stationsWithDistance = stations.map((station) => {
    const [lng, lat] = station.location.coordinates;
    return {
      ...station,
      distanceFromOrigin: haversineDistance(origin.lat, origin.lng, lat, lng),
      distanceToDestination: haversineDistance(
        lat,
        lng,
        destination.lat,
        destination.lng
      ),
    };
  });

  // Sort by distance from origin
  stationsWithDistance.sort((a, b) => a.distanceFromOrigin - b.distanceFromOrigin);

  let maxIterations = 10; // Safety limit
  while (maxIterations > 0) {
    maxIterations--;

    const distToDestination = haversineDistance(
      currentPosition.lat,
      currentPosition.lng,
      destination.lat,
      destination.lng
    );

    // Check if we can reach destination with current battery
    const safeRange =
      ((remainingBattery - safeRangePercent) / 100) * vehicleRange;
    if (distToDestination <= safeRange) {
      break;
    }

    // Find the farthest reachable station along the route
    const reachableStations = stationsWithDistance.filter((station) => {
      const [lng, lat] = station.location.coordinates;
      const distFromCurrent = haversineDistance(
        currentPosition.lat,
        currentPosition.lng,
        lat,
        lng
      );
      return (
        distFromCurrent <= safeRange &&
        distFromCurrent > 0 &&
        station.distanceToDestination < distToDestination
      );
    });

    if (reachableStations.length === 0) {
      // No reachable stations — warn user
      break;
    }

    // Pick the station closest to the max range (greedy approach)
    const bestStop = reachableStations[reachableStations.length - 1];
    const [stopLng, stopLat] = bestStop.location.coordinates;

    const distFromCurrent = haversineDistance(
      currentPosition.lat,
      currentPosition.lng,
      stopLat,
      stopLng
    );

    // Calculate battery used to reach this stop
    const batteryUsedPercent = (distFromCurrent / vehicleRange) * 100;
    const arrivalBattery = Math.max(0, remainingBattery - batteryUsedPercent);

    // Charge to 80% (optimal charging strategy)
    const departureBattery = 80;

    const chargingResult = calculateChargingTime(
      batteryCapacity,
      arrivalBattery,
      departureBattery,
      bestStop.chargerLevel
    );

    stops.push({
      station: bestStop._id,
      stationName: bestStop.name,
      coordinates: [stopLng, stopLat],
      distanceFromPrevious: distFromCurrent,
      estimatedArrivalBattery: Math.round(arrivalBattery),
      estimatedDepartureBattery: departureBattery,
      estimatedChargingTime: chargingResult.timeMinutes,
      estimatedChargingTimeFormatted: chargingResult.timeFormatted,
      chargerLevel: bestStop.chargerLevel,
      order: stops.length + 1,
    });

    // Update position and battery
    currentPosition = { lat: stopLat, lng: stopLng };
    remainingBattery = departureBattery;
  }

  return stops;
}

/**
 * @desc    Save a planned route
 * @route   POST /api/routes
 * @access  Private
 */
const saveRoute = asyncHandler(async (req, res) => {
  req.body.user = req.user.id;
  const route = await Route.create(req.body);

  logger.info(`Route saved by user ${req.user.id}: ${route.name}`);

  res.status(201).json({
    success: true,
    data: route,
  });
});

/**
 * @desc    Get user's saved routes
 * @route   GET /api/routes
 * @access  Private
 */
const getUserRoutes = asyncHandler(async (req, res) => {
  const routes = await Route.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .populate('chargingStops.station', 'name location chargerLevel')
    .lean();

  res.status(200).json({
    success: true,
    data: routes,
    count: routes.length,
  });
});

/**
 * @desc    Delete a saved route
 * @route   DELETE /api/routes/:id
 * @access  Private
 */
const deleteRoute = asyncHandler(async (req, res) => {
  const route = await Route.findOne({
    _id: req.params.id,
    user: req.user.id,
  });

  if (!route) {
    throw ApiError.notFound('Route not found');
  }

  await Route.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: 'Route deleted successfully',
  });
});

module.exports = {
  planRoute,
  saveRoute,
  getUserRoutes,
  deleteRoute,
};

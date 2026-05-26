const { Vehicle, ChargingStation } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get all vehicles (EV database)
 * @route   GET /api/vehicles
 * @access  Public
 */
const getVehicles = asyncHandler(async (req, res) => {
  const { make, category, search } = req.query;
  const filter = { isActive: true };

  if (make) {
    filter.make = new RegExp(make, 'i');
  }
  if (category) {
    filter.category = category;
  }
  if (search) {
    filter.$or = [
      { make: new RegExp(search, 'i') },
      { model: new RegExp(search, 'i') },
    ];
  }

  const vehicles = await Vehicle.find(filter)
    .sort({ make: 1, model: 1 })
    .lean();

  res.status(200).json({
    success: true,
    data: vehicles,
    count: vehicles.length,
  });
});

/**
 * @desc    Get a single vehicle by ID
 * @route   GET /api/vehicles/:id
 * @access  Public
 */
const getVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findById(req.params.id);

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

/**
 * @desc    Get compatible charging stations for a vehicle
 * @route   GET /api/vehicles/:id/compatible-stations?lat=X&lng=Y&radius=Z
 * @access  Public
 */
const getCompatibleStations = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 50 } = req.query;

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  const connectorTypes = vehicle.compatibleConnectors;

  const filter = {
    'connectors.type': { $in: connectorTypes },
    isActive: true,
  };

  // Add geospatial filter if coordinates provided
  if (lat && lng) {
    filter['location.coordinates'] = {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: Number(radius) * 1000,
      },
    };
  }

  const stations = await ChargingStation.find(filter).limit(50).lean();

  // Mark which connectors are compatible
  const stationsWithCompatibility = stations.map((station) => ({
    ...station,
    compatibleConnectors: station.connectors.filter((c) =>
      connectorTypes.includes(c.type)
    ),
    totalCompatibleConnectors: station.connectors
      .filter((c) => connectorTypes.includes(c.type))
      .reduce((sum, c) => sum + c.quantity, 0),
  }));

  res.status(200).json({
    success: true,
    data: {
      vehicle: {
        make: vehicle.make,
        model: vehicle.model,
        compatibleConnectors: vehicle.compatibleConnectors,
      },
      stations: stationsWithCompatibility,
      count: stationsWithCompatibility.length,
    },
  });
});

/**
 * @desc    Create a new vehicle (Admin)
 * @route   POST /api/vehicles
 * @access  Private/Admin
 */
const createVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.create(req.body);

  res.status(201).json({
    success: true,
    data: vehicle,
  });
});

/**
 * @desc    Update a vehicle (Admin)
 * @route   PUT /api/vehicles/:id
 * @access  Private/Admin
 */
const updateVehicle = asyncHandler(async (req, res) => {
  const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!vehicle) {
    throw ApiError.notFound('Vehicle not found');
  }

  res.status(200).json({
    success: true,
    data: vehicle,
  });
});

/**
 * @desc    Get unique vehicle makes for dropdown
 * @route   GET /api/vehicles/makes
 * @access  Public
 */
const getVehicleMakes = asyncHandler(async (req, res) => {
  const makes = await Vehicle.distinct('make', { isActive: true });

  res.status(200).json({
    success: true,
    data: makes.sort(),
  });
});

module.exports = {
  getVehicles,
  getVehicle,
  getCompatibleStations,
  createVehicle,
  updateVehicle,
  getVehicleMakes,
};

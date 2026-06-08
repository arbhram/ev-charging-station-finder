const { ChargingStation } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const nepalStations = require('../utils/nepalStations');
const {
  calculateReachableDistance,
  filterReachableStations,
  haversineDistance,
} = require('../utils/calculations');
const logger = require('../utils/logger');
const { notifyStationAvailable, notifyNewStation } = require('../services/notificationService');

/**
 * @desc    Get all charging stations with filtering, sorting, and pagination
 * @route   GET /api/stations
 * @access  Public
 */
const getStations = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    chargerLevel,
    connectorType,
    isFree,
    minPower,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = req.query;

  const filter = { isActive: true, 'location.address.country': 'Nepal' };

  if (chargerLevel) {
    filter.chargerLevel = chargerLevel;
  }

  if (connectorType) {
    filter['connectors.type'] = connectorType;
  }

  if (isFree === 'true') {
    filter['pricing.isFree'] = true;
  }

  if (minPower) {
    filter['connectors.powerKW'] = { $gte: Number(minPower) };
  }

  if (search) {
    const nepalProvinces = ['Bagmati', 'Gandaki', 'Lumbini', 'Koshi', 'Madhesh', 'Karnali', 'Sudurpashchim'];
    const isProvince = nepalProvinces.some((p) => p.toLowerCase() === search.trim().toLowerCase());

    if (isProvince) {
      filter['location.address.state'] = { $regex: search.trim(), $options: 'i' };
    } else {
      filter.$or = [
        { 'location.address.suburb': { $regex: search, $options: 'i' } },
        { 'location.address.city': { $regex: search, $options: 'i' } },
        { 'location.address.state': { $regex: search, $options: 'i' } },
        { 'location.formattedAddress': { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }
  }

  const skip = (Number(page) - 1) * Number(limit);
  const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

  // When $or regex search is active, the text index on those same fields conflicts
  // with a non-text sort, causing MongoDB "No query solutions". Force a collection scan.
  let stationQuery = ChargingStation.find(filter).sort(sort).skip(skip).limit(Number(limit));
  if (filter.$or) stationQuery = stationQuery.hint({ $natural: 1 });

  const [stations, total] = await Promise.all([
    stationQuery.lean(),
    ChargingStation.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: stations,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      pages: Math.ceil(total / Number(limit)),
    },
  });
});

/**
 * @desc    Get nearby charging stations
 * @route   GET /api/stations/nearby?lat=X&lng=Y&radius=Z
 * @access  Public
 */
const getNearbyStations = asyncHandler(async (req, res) => {
  const { lat, lng, radius = 50, connectorType, chargerLevel } = req.query;

  if (!lat || !lng) {
    throw ApiError.badRequest('Latitude and longitude are required');
  }

  const radiusInMeters = Number(radius) * 1000;

  const matchStage = {
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: radiusInMeters,
      },
    },
    isActive: true,
    'location.address.country': 'Nepal',
  };

  if (connectorType) {
    matchStage['connectors.type'] = connectorType;
  }

  if (chargerLevel) {
    matchStage.chargerLevel = chargerLevel;
  }

  const stations = await ChargingStation.find(matchStage).limit(50).lean();

  // Add distance to each station
  const stationsWithDistance = stations.map((station) => {
    const [stationLng, stationLat] = station.location.coordinates;
    const distance = haversineDistance(
      Number(lat),
      Number(lng),
      stationLat,
      stationLng
    );
    return { ...station, distance };
  });

  stationsWithDistance.sort((a, b) => a.distance - b.distance);

  res.status(200).json({
    success: true,
    data: stationsWithDistance,
    count: stationsWithDistance.length,
  });
});

/**
 * @desc    Get reachable stations based on battery range
 * @route   GET /api/stations/reachable?lat=X&lng=Y&battery=Z&range=W
 * @access  Public
 */
const getReachableStations = asyncHandler(async (req, res) => {
  const { lat, lng, battery, range } = req.query;

  if (!lat || !lng || !battery || !range) {
    throw ApiError.badRequest(
      'Latitude, longitude, battery percentage, and vehicle range are required'
    );
  }

  const { reachableDistance, safeDistance } = calculateReachableDistance(
    Number(battery),
    Number(range)
  );

  // Fetch stations within reachable distance
  const radiusInMeters = reachableDistance * 1000;
  const stations = await ChargingStation.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [Number(lng), Number(lat)],
        },
        $maxDistance: radiusInMeters,
      },
    },
    isActive: true,
  }).lean();

  const reachableStations = filterReachableStations(
    stations,
    Number(lat),
    Number(lng),
    safeDistance
  );

  res.status(200).json({
    success: true,
    data: {
      reachableDistance,
      safeDistance,
      stations: reachableStations,
      count: reachableStations.length,
      message: `You can safely reach ${reachableStations.length} charging station(s)`,
    },
  });
});

/**
 * @desc    Get a single station by ID
 * @route   GET /api/stations/:id
 * @access  Public
 */
const getStation = asyncHandler(async (req, res) => {
  const station = await ChargingStation.findById(req.params.id);

  if (!station) {
    throw ApiError.notFound('Charging station not found');
  }

  res.status(200).json({
    success: true,
    data: station,
  });
});

/**
 * @desc    Create a new charging station
 * @route   POST /api/stations
 * @access  Private/Admin
 */
const createStation = asyncHandler(async (req, res) => {
  req.body.addedBy = req.user.id;

  const station = await ChargingStation.create(req.body);

  logger.info(`New station created: ${station.name} by user ${req.user.id}`);

  // Notify nearby users asynchronously — don't block the response
  notifyNewStation(station).catch(() => {});

  res.status(201).json({
    success: true,
    data: station,
  });
});

/**
 * @desc    Update a charging station
 * @route   PUT /api/stations/:id
 * @access  Private/Admin
 */
const updateStation = asyncHandler(async (req, res) => {
  let station = await ChargingStation.findById(req.params.id);

  if (!station) {
    throw ApiError.notFound('Charging station not found');
  }

  // Snapshot availability before update so we can detect changes
  const prevAvailable = station.connectors?.reduce((s, c) => s + (c.available || 0), 0) || 0;

  station = await ChargingStation.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  logger.info(`Station updated: ${station.name} by user ${req.user.id}`);

  // If connectors went from 0 → available, notify users who favourited this station
  const newAvailable = station.connectors?.reduce((s, c) => s + (c.available || 0), 0) || 0;
  if (prevAvailable === 0 && newAvailable > 0) {
    notifyStationAvailable(station).catch(() => {});
  }

  // Broadcast live status update to any socket subscribers
  const socketService = req.app.get('socketService');
  if (socketService) {
    socketService.broadcastStationUpdate(station._id.toString(), {
      stationId:  station._id,
      connectors: station.connectors,
      available:  newAvailable,
    });
  }

  res.status(200).json({
    success: true,
    data: station,
  });
});

/**
 * @desc    Delete a charging station (soft delete)
 * @route   DELETE /api/stations/:id
 * @access  Private/Admin
 */
const deleteStation = asyncHandler(async (req, res) => {
  const station = await ChargingStation.findById(req.params.id);

  if (!station) {
    throw ApiError.notFound('Charging station not found');
  }

  station.isActive = false;
  await station.save();

  logger.info(`Station soft-deleted: ${station.name} by user ${req.user.id}`);

  res.status(200).json({
    success: true,
    message: 'Station deleted successfully',
  });
});

/**
 * @desc    Get station analytics (Admin)
 * @route   GET /api/stations/analytics/overview
 * @access  Private/Admin
 */
const getStationAnalytics = asyncHandler(async (req, res) => {
  const [totalStations, stationsByLevel, stationsByConnector, recentStations] =
    await Promise.all([
      ChargingStation.countDocuments({ isActive: true }),
      ChargingStation.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$chargerLevel', count: { $sum: 1 } } },
      ]),
      ChargingStation.aggregate([
        { $match: { isActive: true } },
        { $unwind: '$connectors' },
        { $group: { _id: '$connectors.type', count: { $sum: 1 } } },
      ]),
      ChargingStation.find({ isActive: true })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('name location.address.city chargerLevel createdAt')
        .lean(),
    ]);

  res.status(200).json({
    success: true,
    data: {
      totalStations,
      stationsByLevel,
      stationsByConnector,
      recentStations,
    },
  });
});


/**
 * @desc    Update connector availability status
 * @route   PATCH /api/stations/:id/availability
 * @access  Private/Admin
 */
const updateAvailability = asyncHandler(async (req, res) => {
  const { connectorIndex, available, status } = req.body;
  const station = await ChargingStation.findById(req.params.id);
  if (!station) throw ApiError.notFound('Station not found');

  const prevAvailable = station.connectors?.reduce((s, c) => s + (c.available || 0), 0) || 0;

  if (connectorIndex !== undefined && station.connectors[connectorIndex]) {
    if (available !== undefined) station.connectors[connectorIndex].available = available;
    if (status)                  station.connectors[connectorIndex].status    = status;
  } else {
    // Update all connectors
    station.connectors = station.connectors.map((c) => ({
      ...c,
      available: available !== undefined ? available : c.available,
      status:    status    || c.status,
    }));
  }

  station.markModified('connectors');
  await station.save();

  const newAvailable = station.connectors?.reduce((s, c) => s + (c.available || 0), 0) || 0;
  if (prevAvailable === 0 && newAvailable > 0) {
    const { notifyStationAvailable } = require('../services/notificationService');
    notifyStationAvailable(station).catch(() => {});
  }

  const socketService = req.app.get('socketService');
  if (socketService) {
    socketService.broadcastStationUpdate(station._id.toString(), {
      stationId: station._id, connectors: station.connectors, available: newAvailable,
    });
  }

  res.status(200).json({ success: true, data: station });
});

/**
 * @desc    Verify / unverify a station
 * @route   PATCH /api/stations/:id/verify
 * @access  Private/Admin
 */
const verifyStation = asyncHandler(async (req, res) => {
  const { isVerified } = req.body;
  const station = await ChargingStation.findByIdAndUpdate(
    req.params.id,
    { isVerified: isVerified !== false },
    { new: true }
  );
  if (!station) throw ApiError.notFound('Station not found');
  res.status(200).json({ success: true, data: station });
});

/**
 * @desc    Bulk import stations from JSON array or CSV text
 * @route   POST /api/stations/bulk-import
 * @access  Private/Admin
 */
const bulkImport = asyncHandler(async (req, res) => {
  const { stations: rawList, csv } = req.body;
  let list = rawList || [];

  // Simple CSV parse: name,lat,lng,address,chargerLevel,connectorType,powerKW,pricePerKWh
  if (csv) {
    const rows = csv.trim().split('\n').slice(1); // skip header
    list = rows.map((row) => {
      const [name, lat, lng, address, chargerLevel, connectorType, powerKW, pricePerKWh] = row.split(',').map((v) => v.trim());
      return {
        name,
        location: { type: 'Point', coordinates: [Number(lng), Number(lat)], formattedAddress: address },
        chargerLevel: chargerLevel || 'Level 2',
        connectors: [{ type: connectorType || 'Type 2', powerKW: Number(powerKW) || 22, quantity: 1, available: 1, status: 'available' }],
        pricing: { perKWh: Number(pricePerKWh) || 0, isFree: Number(pricePerKWh) === 0, currency: 'NPR' },
        source: 'manual',
      };
    });
  }

  if (!list.length) throw ApiError.badRequest('No stations provided');

  // Normalise and insert
  const docs = list.map((s) => ({
    name: s.name,
    location: s.location,
    chargerLevel: s.chargerLevel || 'Level 2',
    connectors: s.connectors || [],
    pricing: s.pricing || {},
    isActive: true,
    isVerified: false,
    source: s.source || 'manual',
    addedBy: req.user.id,
  }));

  const inserted = await ChargingStation.insertMany(docs, { ordered: false });
  logger.info(`Bulk import: ${inserted.length} stations added by ${req.user.id}`);
  res.status(201).json({ success: true, count: inserted.length, data: inserted });
});

/**
 * @desc    Return seed stations — tries DB first, falls back to static data
 * @route   GET /api/stations/seeded
 * @access  Public
 */
const getSeededStations = asyncHandler(async (req, res) => {
  let stations = [];
  try {
    stations = await ChargingStation.find(
      { dataSource: { $in: ['seed', 'manual'] }, isActive: true, 'location.address.country': 'Nepal' },
      { __v: 0 }
    ).lean();
  } catch { /* DB unavailable — fall through to static data */ }

  if (stations.length === 0) {
    stations = nepalStations.map((s, i) => ({ ...s, _id: `seed-${i}` }));
  }

  res.json({ success: true, count: stations.length, data: stations });
});

module.exports = {
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
  getSeededStations,
};

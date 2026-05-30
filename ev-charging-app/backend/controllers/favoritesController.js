const { User, ChargingStation } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @desc    Get user's favorite stations
 * @route   GET /api/favorites
 * @access  Private
 */
const getFavorites = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
    .populate({
      path: 'favorites',
      select:
        'name location chargerLevel connectors pricing rating amenities operatingHours osmId',
      match: { isActive: true },
    })
    .select('favorites');

  res.status(200).json({
    success: true,
    data: user.favorites,
    count: user.favorites.length,
  });
});

/**
 * @desc    Add a station to favorites
 * @route   POST /api/favorites/:stationId
 * @access  Private
 */
const addFavorite = asyncHandler(async (req, res) => {
  const { stationId } = req.params;

  // Verify station exists
  const station = await ChargingStation.findById(stationId);
  if (!station) {
    throw ApiError.notFound('Charging station not found');
  }

  const user = await User.findById(req.user.id);

  // Already favourited — return success silently (idempotent)
  if (user.favorites.includes(stationId)) {
    return res.status(200).json({
      success: true,
      message: 'Station already in favorites',
      data: { stationId },
    });
  }

  user.favorites.push(stationId);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Station added to favorites',
    data: { stationId },
  });
});

/**
 * @desc    Remove a station from favorites
 * @route   DELETE /api/favorites/:stationId
 * @access  Private
 */
const removeFavorite = asyncHandler(async (req, res) => {
  const { stationId } = req.params;

  const user = await User.findById(req.user.id);

  const index = user.favorites.indexOf(stationId);
  if (index === -1) {
    throw ApiError.notFound('Station not in favorites');
  }

  user.favorites.splice(index, 1);
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: 'Station removed from favorites',
  });
});

/**
 * @desc    Check if a station is favorited
 * @route   GET /api/favorites/check/:stationId
 * @access  Private
 */
const checkFavorite = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('favorites');

  res.status(200).json({
    success: true,
    data: {
      isFavorite: user.favorites.includes(req.params.stationId),
    },
  });
});

/**
 * @desc    Upsert an OSM/community station into DB and add to favorites
 * @route   POST /api/favorites/adopt
 * @access  Private
 */
const adoptAndFavorite = asyncHandler(async (req, res) => {
  const { station: s } = req.body;
  if (!s || typeof s._id !== 'string' || /^[0-9a-f]{24}$/i.test(s._id)) {
    throw ApiError.badRequest('Invalid community station data');
  }

  const osmId = s._id; // stores 'osm-xxx' or 'ocm-xxx' external IDs
  const adopted = await ChargingStation.findOneAndUpdate(
    { osmId },
    {
      $set: {
        name: s.name || 'EV Charging Station',
        'location.type': 'Point',
        'location.coordinates': s.location.coordinates,
        'location.formattedAddress': s.location.formattedAddress || '',
        'location.address': s.location.address || {},
        chargerLevel: s.chargerLevel || 'Level 2',
        connectors: (s.connectors || []).map((c) => ({
          type: c.type || 'Type 2',
          powerKW: c.powerKW || 22,
          quantity: c.quantity || 1,
          available: c.available ?? c.quantity ?? 1,
          status: c.status || 'available',
        })),
        'pricing.isFree': s.pricing?.isFree || false,
        'pricing.perKWh': s.pricing?.perKWh || 0,
        'pricing.currency': s.pricing?.currency || 'AUD',
        'operator.name': s.operator?.name || '',
        isActive: true,
      },
      $setOnInsert: {
        osmId,
        dataSource: 'other',
        isVerified: false,
      },
    },
    { upsert: true, new: true, runValidators: false }
  );

  const mongoId = adopted._id.toString();
  const user = await User.findById(req.user.id);
  if (!user.favorites.map((f) => f.toString()).includes(mongoId)) {
    user.favorites.push(mongoId);
    await user.save({ validateBeforeSave: false });
  }

  res.status(200).json({
    success: true,
    message: 'Community station saved to favorites',
    data: { osmId, mongoId },
  });
});

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
  adoptAndFavorite,
};

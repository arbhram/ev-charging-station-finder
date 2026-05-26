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
        'name location chargerLevel connectors pricing rating amenities operatingHours',
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

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite,
  checkFavorite,
};

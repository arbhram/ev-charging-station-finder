const { User, ChargingStation, Vehicle, Route, Report, Notification } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { haversineDistance } = require('../utils/calculations');
const logger = require('../utils/logger');

// ── USER MANAGEMENT ────────────────────────────────────────────────

const getUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search = '', role } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { name:  { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  if (role) filter.role = role;

  const skip = (Number(page) - 1) * Number(limit);
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: users,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

const toggleBlockUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.toString() === req.user.id) throw ApiError.badRequest('Cannot block yourself');

  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });

  logger.info(`User ${user.email} ${user.isActive ? 'unblocked' : 'blocked'} by admin ${req.user.id}`);
  res.status(200).json({ success: true, data: { isActive: user.isActive } });
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found');
  if (user._id.toString() === req.user.id) throw ApiError.badRequest('Cannot delete yourself');
  if (user.role === 'admin') throw ApiError.badRequest('Cannot delete another admin');

  await User.findByIdAndDelete(req.params.id);
  logger.info(`User ${user.email} deleted by admin ${req.user.id}`);
  res.status(200).json({ success: true, message: 'User deleted' });
});

const getUserActivity = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)
    .select('-password')
    .populate('favorites', 'name location.address.city')
    .lean();
  if (!user) throw ApiError.notFound('User not found');

  const [routeCount, reportCount] = await Promise.all([
    Route.countDocuments({ user: req.params.id }),
    Report.countDocuments({ user: req.params.id }),
  ]);

  res.status(200).json({ success: true, data: { ...user, routeCount, reportCount } });
});

// ── ADMIN ANALYTICS ────────────────────────────────────────────────

const getAdminAnalytics = asyncHandler(async (req, res) => {
  const [
    totalStations,
    totalUsers,
    totalRoutes,
    openReports,
    stationsByLevel,
    stationsByConnector,
    recentUsers,
    recentStations,
    routesPerDay,
    topStations,
  ] = await Promise.all([
    ChargingStation.countDocuments({ isActive: true }),
    User.countDocuments({ role: { $ne: 'admin' } }),
    Route.countDocuments(),
    Report.countDocuments({ status: 'open' }),
    ChargingStation.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$chargerLevel', count: { $sum: 1 } } },
    ]),
    ChargingStation.aggregate([
      { $match: { isActive: true } },
      { $unwind: '$connectors' },
      { $group: { _id: '$connectors.type', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    User.find({ role: { $ne: 'admin' } })
      .select('name email createdAt isActive')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    ChargingStation.find({ isActive: true })
      .select('name location.address.city chargerLevel createdAt isVerified')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    // Routes per day (last 7 days)
    Route.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 7 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    // Most favourited stations
    User.aggregate([
      { $unwind: '$favorites' },
      { $group: { _id: '$favorites', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      { $lookup: { from: 'chargingstations', localField: '_id', foreignField: '_id', as: 'station' } },
      { $unwind: '$station' },
      { $project: { name: '$station.name', city: '$station.location.address.city', count: 1 } },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalStations, totalUsers, totalRoutes, openReports,
      stationsByLevel, stationsByConnector,
      recentUsers, recentStations, routesPerDay, topStations,
    },
  });
});

// ── REPORTS / FEEDBACK ─────────────────────────────────────────────

const getReports = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status) filter.status = status;

  const skip = (Number(page) - 1) * Number(limit);
  const [reports, total] = await Promise.all([
    Report.find(filter)
      .populate('station', 'name location.address.city location.formattedAddress')
      .populate('user', 'name email')
      .populate('resolvedBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean(),
    Report.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    data: reports,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

const resolveReport = asyncHandler(async (req, res) => {
  const { status, resolvedNote } = req.body;
  const report = await Report.findById(req.params.id);
  if (!report) throw ApiError.notFound('Report not found');

  report.status      = status || 'resolved';
  report.resolvedBy  = req.user.id;
  report.resolvedNote = resolvedNote || '';
  report.resolvedAt  = new Date();
  await report.save();

  res.status(200).json({ success: true, data: report });
});

const createReport = asyncHandler(async (req, res) => {
  const report = await Report.create({ ...req.body, user: req.user?.id });
  res.status(201).json({ success: true, data: report });
});

// ── SEARCH HISTORY / ROUTE ANALYTICS ──────────────────────────────

const getSearchAnalytics = asyncHandler(async (req, res) => {
  const [popularDestinations, popularOrigins, routesByDay] = await Promise.all([
    Route.aggregate([
      { $group: { _id: '$destination.name', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Route.aggregate([
      { $group: { _id: '$origin.name', count: { $sum: 1 } } },
      { $match: { _id: { $ne: null } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Route.aggregate([
      { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  // Most popular search terms from user recentSearches
  const searchTerms = await User.aggregate([
    { $unwind: '$recentSearches' },
    { $group: { _id: '$recentSearches.query', count: { $sum: 1 } } },
    { $match: { _id: { $ne: null } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  res.status(200).json({
    success: true,
    data: { popularDestinations, popularOrigins, routesByDay, searchTerms },
  });
});

module.exports = {
  getUsers, toggleBlockUser, deleteUser, getUserActivity,
  getAdminAnalytics,
  getReports, resolveReport, createReport,
  getSearchAnalytics,
};

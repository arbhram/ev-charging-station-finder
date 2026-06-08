const { HostProfile, ChargingStation, User } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { uploadToCloudinary, deleteFromCloudinary } = require('../services/cloudinaryService');
const logger = require('../utils/logger');

/**
 * @desc    Register as a host (Step 1-4 combined or per-step)
 * @route   POST /api/host/register
 * @access  Protected
 */
const registerHost = asyncHandler(async (req, res) => {
  const existing = await HostProfile.findOne({ userId: req.user.id });
  if (existing) {
    throw ApiError.badRequest('You already have a host profile');
  }

  const {
    connectorType, powerKW, brand, model: chargerModel,
    coordinates, address,
    parkingType, amenities,
    pricePerKwh, schedule,
    whatsapp, description,
  } = req.body;

  if (!connectorType || !powerKW || !coordinates || !pricePerKwh) {
    throw ApiError.badRequest('Connector type, power, location, and price are required');
  }

  const host = await HostProfile.create({
    userId:    req.user.id,
    chargerSpecs:  { connectorType, powerKW, brand, model: chargerModel },
    location:  { type: 'Point', coordinates, address: address || {} },
    parkingType,
    amenities:  amenities || [],
    pricing:   { amount: pricePerKwh, currency: 'NPR', unit: 'kWh' },
    availability: { schedule: schedule || [] },
    whatsapp:  whatsapp || '',
    description: description || '',
    status:    'pending',
  });

  // Upgrade user role to host
  await User.findByIdAndUpdate(req.user.id, { role: 'host' });

  logger.info(`Host profile created: ${host._id} by user ${req.user.id}`);
  res.status(201).json({ success: true, data: host });
});

/**
 * @desc    Get the current user's host profile / status
 * @route   GET /api/host/status
 * @access  Protected
 */
const getHostStatus = asyncHandler(async (req, res) => {
  const profile = await HostProfile.findOne({ userId: req.user.id }).lean();
  if (!profile) {
    return res.json({ success: true, data: null });
  }
  res.json({ success: true, data: profile });
});

/**
 * @desc    Upload charger photos
 * @route   POST /api/host/photos
 * @access  Protected (host)
 */
const uploadPhotos = asyncHandler(async (req, res) => {
  const profile = await HostProfile.findOne({ userId: req.user.id });
  if (!profile) throw ApiError.notFound('Host profile not found');

  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest('No files uploaded');
  }

  const uploaded = await Promise.all(
    req.files.map((f) => uploadToCloudinary(f.buffer, f.mimetype, `host-${profile._id}`))
  );

  const urls = uploaded.map((r) => r.secure_url);
  profile.chargerPhotos = [...profile.chargerPhotos, ...urls].slice(0, 10);
  await profile.save();

  res.json({ success: true, data: { photos: profile.chargerPhotos } });
});

/**
 * @desc    Delete a photo
 * @route   DELETE /api/host/photos
 * @access  Protected (host)
 */
const deletePhoto = asyncHandler(async (req, res) => {
  const { url } = req.body;
  const profile = await HostProfile.findOne({ userId: req.user.id });
  if (!profile) throw ApiError.notFound('Host profile not found');

  await deleteFromCloudinary(url);
  profile.chargerPhotos = profile.chargerPhotos.filter((p) => p !== url);
  await profile.save();

  res.json({ success: true, data: { photos: profile.chargerPhotos } });
});

/**
 * @desc    Update host profile (charger specs, pricing, availability)
 * @route   PUT /api/host/profile
 * @access  Protected (host)
 */
const updateHostProfile = asyncHandler(async (req, res) => {
  const profile = await HostProfile.findOne({ userId: req.user.id });
  if (!profile) throw ApiError.notFound('Host profile not found');

  const allowed = [
    'chargerSpecs', 'location', 'parkingType', 'amenities',
    'pricing', 'availability', 'whatsapp', 'description',
  ];

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) profile[key] = req.body[key];
  });

  await profile.save();
  res.json({ success: true, data: profile });
});

/**
 * @desc    Get host listing page (public)
 * @route   GET /api/host/:id/listing
 * @access  Public
 */
const getHostListing = asyncHandler(async (req, res) => {
  const profile = await HostProfile.findById(req.params.id)
    .populate('userId', 'name avatar createdAt')
    .populate('stationId')
    .lean();

  if (!profile || profile.status !== 'approved') {
    throw ApiError.notFound('Host listing not found');
  }

  res.json({ success: true, data: profile });
});

/**
 * @desc    Get host dashboard (authenticated host only)
 * @route   GET /api/host/dashboard
 * @access  Protected (host)
 */
const getHostDashboard = asyncHandler(async (req, res) => {
  const profile = await HostProfile.findOne({ userId: req.user.id }).lean();
  if (!profile) throw ApiError.notFound('Host profile not found');

  res.json({
    success: true,
    data: {
      profile,
      stats: profile.stats,
      status: profile.status,
    },
  });
});

// ── Admin-only handlers ────────────────────────────────────────────────────

/**
 * @desc    List all host applications (admin)
 * @route   GET /api/host/admin/all
 * @access  Admin
 */
const adminListHosts = asyncHandler(async (req, res) => {
  const { status = 'pending', page = 1, limit = 20 } = req.query;
  const filter = status === 'all' ? {} : { status };

  const [hosts, total] = await Promise.all([
    HostProfile.find(filter)
      .populate('userId', 'name email phone')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean(),
    HostProfile.countDocuments(filter),
  ]);

  res.json({ success: true, data: hosts, total });
});

/**
 * @desc    Approve a host application (admin)
 * @route   PUT /api/host/admin/:id/approve
 * @access  Admin
 */
const adminApproveHost = asyncHandler(async (req, res) => {
  const profile = await HostProfile.findById(req.params.id).populate('userId', 'name email');
  if (!profile) throw ApiError.notFound('Host profile not found');

  profile.status = 'approved';
  profile.rejectionReason = '';

  // Create the ChargingStation entry for this host
  if (!profile.stationId) {
    const station = await ChargingStation.create({
      name: `${profile.userId.name}'s home charger`,
      location: {
        type:             'Point',
        coordinates:      profile.location.coordinates,
        formattedAddress: profile.location.address?.formattedAddress || '',
        address: {
          street:  profile.location.address?.street  || '',
          suburb:  profile.location.address?.area    || '',
          city:    profile.location.address?.city    || '',
          state:   profile.location.address?.province || '',
          country: 'Nepal',
        },
      },
      operator:     { name: 'Private' },
      connectors:   [{
        type:      profile.chargerSpecs.connectorType,
        powerKW:   profile.chargerSpecs.powerKW,
        quantity:  1,
        available: 1,
        status:    'available',
      }],
      chargerLevel: profile.chargerSpecs.powerKW >= 22 ? 'DC Fast Charger' : 'Level 2',
      pricing: {
        perKWh:   profile.pricing.amount,
        currency: 'NPR',
        isFree:   false,
      },
      amenities:   profile.amenities,
      isActive:    true,
      dataSource:  'host',
      'location.address.country': 'Nepal',
    });
    profile.stationId = station._id;
    profile.badges.addToSet('verified');
  }

  await profile.save();
  logger.info(`Host approved: ${profile._id}`);
  res.json({ success: true, data: profile });
});

/**
 * @desc    Reject a host application (admin)
 * @route   PUT /api/host/admin/:id/reject
 * @access  Admin
 */
const adminRejectHost = asyncHandler(async (req, res) => {
  const { reason = '' } = req.body;
  const profile = await HostProfile.findById(req.params.id);
  if (!profile) throw ApiError.notFound('Host profile not found');

  profile.status = 'rejected';
  profile.rejectionReason = reason;

  // Downgrade user role back
  await User.findByIdAndUpdate(profile.userId, { role: 'user' });
  await profile.save();

  logger.info(`Host rejected: ${profile._id}`);
  res.json({ success: true, data: profile });
});

module.exports = {
  registerHost,
  getHostStatus,
  uploadPhotos,
  deletePhoto,
  updateHostProfile,
  getHostListing,
  getHostDashboard,
  adminListHosts,
  adminApproveHost,
  adminRejectHost,
};

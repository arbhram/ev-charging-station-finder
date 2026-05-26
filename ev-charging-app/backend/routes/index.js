const express = require('express');
const router = express.Router();

/**
 * Central route registration.
 * All API routes are prefixed with /api.
 */
router.use('/auth', require('./authRoutes'));
router.use('/stations', require('./stationRoutes'));
router.use('/calculator', require('./calculatorRoutes'));
router.use('/vehicles', require('./vehicleRoutes'));
router.use('/notifications', require('./notificationRoutes'));
router.use('/routes', require('./routePlannerRoutes'));
router.use('/favorites', require('./favoritesRoutes'));
router.use('/admin', require('./adminRoutes'));
router.use('/v1/ai', require('./aiRoutes'));

module.exports = router;

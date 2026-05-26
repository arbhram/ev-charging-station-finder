const { Notification, User } = require('../models');
const { sendAvailabilityAlert, sendNewStationAlert } = require('./emailService');
const { haversineDistance } = require('../utils/calculations');
const logger = require('../utils/logger');

let _socketService = null;

/**
 * Call once from server.js after socketService is initialised.
 */
const setSocketService = (service) => {
  _socketService = service;
};

/**
 * Core helper — persists one notification to MongoDB then pushes it via
 * Socket.IO and (optionally) sends an email.
 */
const createAndDispatch = async ({
  userId,
  type,
  title,
  message,
  stationId = null,
  deliveryMethod = 'in_app',
  metadata = {},
}) => {
  try {
    // 1. Persist to DB
    const notification = await Notification.create({
      user:     userId,
      type,
      title,
      message,
      station:        stationId || undefined,
      deliveryMethod,
      metadata,
    });

    // 2. Real-time push via Socket.IO
    if (_socketService) {
      _socketService.notifyUser(userId.toString(), {
        _id:       notification._id,
        type,
        title,
        message,
        station:   stationId,
        createdAt: notification.createdAt,
        isRead:    false,
      });
    }

    // 3. Email for 'email' or 'all' delivery methods
    if (deliveryMethod === 'email' || deliveryMethod === 'all') {
      const user = await User.findById(userId).select('email').lean();
      if (user?.email) {
        if (type === 'charger_available') {
          await sendAvailabilityAlert(
            user.email,
            metadata.stationName  || title,
            metadata.stationAddress || ''
          ).catch((e) => logger.warn(`Email failed: ${e.message}`));
        } else if (type === 'new_station') {
          await sendNewStationAlert(
            user.email,
            metadata.stationName || title,
            metadata.distanceKm  || 0
          ).catch((e) => logger.warn(`Email failed: ${e.message}`));
        }
      }
    }

    return notification;
  } catch (err) {
    logger.error(`createAndDispatch error: ${err.message}`);
    return null;
  }
};

/**
 * Trigger: a charger at `station` just became available.
 * Notifies every user who has that station in their favorites.
 */
const notifyStationAvailable = async (station) => {
  try {
    const users = await User.find({ favorites: station._id }).select('_id').lean();
    if (!users.length) return;

    await Promise.all(
      users.map((u) =>
        createAndDispatch({
          userId:         u._id,
          type:           'charger_available',
          title:          'Charger Now Available',
          message:        `A charger is now free at ${station.name}. Head over before it fills up!`,
          stationId:      station._id,
          deliveryMethod: 'all',
          metadata: {
            stationName:    station.name,
            stationAddress: station.location?.formattedAddress || '',
          },
        })
      )
    );

    logger.info(`Notified ${users.length} user(s) — charger available at "${station.name}"`);
  } catch (err) {
    logger.error(`notifyStationAvailable error: ${err.message}`);
  }
};

/**
 * Trigger: a brand-new station was added.
 * Notifies all active users who have newStationAlerts enabled.
 */
const notifyNewStation = async (station) => {
  try {
    const users = await User.find({
      isActive: true,
      role:     { $ne: 'admin' },
      'notificationPreferences.newStationAlerts': { $ne: false },
    })
      .select('_id')
      .lean();

    if (!users.length) return;

    await Promise.all(
      users.map((u) =>
        createAndDispatch({
          userId:         u._id,
          type:           'new_station',
          title:          'New Charging Station Added',
          message:        `${station.name} has just been added to the network. Check it out!`,
          stationId:      station._id,
          deliveryMethod: 'in_app',
          metadata: {
            stationName: station.name,
            stationAddress: station.location?.formattedAddress || '',
          },
        })
      )
    );

    logger.info(`Notified ${users.length} user(s) — new station "${station.name}"`);
  } catch (err) {
    logger.error(`notifyNewStation error: ${err.message}`);
  }
};

/**
 * Trigger: a user successfully planned a route with charging stops.
 */
const notifyRoutePlanned = async (userId, originName, destName, stopsCount) => {
  try {
    await createAndDispatch({
      userId,
      type:           'system',
      title:          'Route Ready',
      message:        `Your route from ${originName} to ${destName} is planned with ${stopsCount} charging stop${stopsCount !== 1 ? 's' : ''}.`,
      deliveryMethod: 'in_app',
      metadata:       { originName, destName, stopsCount },
    });
  } catch (err) {
    logger.error(`notifyRoutePlanned error: ${err.message}`);
  }
};

/**
 * Periodic job — simulates availability changes for stations that have
 * favouriting users (replaces OCPP until real hardware is connected).
 * Call startAvailabilityPolling() from server.js.
 */
const startAvailabilityPolling = (intervalMs = 5 * 60 * 1000) => {
  const { ChargingStation } = require('../models');

  const poll = async () => {
    try {
      // Find stations that at least one user has favourited
      const users = await User.find({ 'favorites.0': { $exists: true } })
        .select('favorites')
        .lean();

      const favIds = [...new Set(users.flatMap((u) => u.favorites.map(String)))];
      if (!favIds.length) return;

      // Pick up to 3 random favourited stations
      const stations = await ChargingStation.find({
        _id:      { $in: favIds },
        isActive: true,
      })
        .limit(3)
        .lean();

      for (const station of stations) {
        // Simulate: at least one connector just became available
        const hadAvailable = station.connectors?.some((c) => (c.available || 0) > 0);
        if (!hadAvailable) {
          await notifyStationAvailable(station);
        }
      }
    } catch (err) {
      logger.error(`Availability poll error: ${err.message}`);
    }
  };

  // Run immediately then on interval
  poll();
  const handle = setInterval(poll, intervalMs);
  logger.info(`Availability polling started — interval: ${intervalMs / 1000}s`);
  return handle;
};

module.exports = {
  setSocketService,
  createAndDispatch,
  notifyStationAvailable,
  notifyNewStation,
  notifyRoutePlanned,
  startAvailabilityPolling,
};

const logger = require('../utils/logger');

/**
 * Socket.IO service for real-time notifications.
 * Handles user room management and broadcast events.
 *
 * @param {object} io - Socket.IO server instance
 */
const initializeSocketService = (io) => {
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        logger.debug(`User ${userId} joined room`);
      }
    });

    // Leave user room
    socket.on('leave', (userId) => {
      if (userId) {
        socket.leave(`user_${userId}`);
        logger.debug(`User ${userId} left room`);
      }
    });

    // Subscribe to station updates
    socket.on('subscribe_station', (stationId) => {
      socket.join(`station_${stationId}`);
      logger.debug(`Socket ${socket.id} subscribed to station ${stationId}`);
    });

    // Unsubscribe from station updates
    socket.on('unsubscribe_station', (stationId) => {
      socket.leave(`station_${stationId}`);
    });

    socket.on('disconnect', () => {
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  return {
    /**
     * Send notification to a specific user.
     */
    notifyUser: (userId, notification) => {
      io.to(`user_${userId}`).emit('notification', notification);
    },

    /**
     * Broadcast station status update to all subscribers.
     */
    broadcastStationUpdate: (stationId, data) => {
      io.to(`station_${stationId}`).emit('station_update', data);
    },

    /**
     * Broadcast to all connected clients.
     */
    broadcastAll: (event, data) => {
      io.emit(event, data);
    },
  };
};

module.exports = initializeSocketService;

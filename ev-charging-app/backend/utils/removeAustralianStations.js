require('dotenv').config();
const mongoose = require('mongoose');
const { ChargingStation } = require('../models');
const logger = require('./logger');

/**
 * One-time cleanup: removes all non-Nepal stations from MongoDB.
 * Usage: node backend/utils/removeAustralianStations.js
 */
const cleanup = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    const result = await ChargingStation.deleteMany({
      'location.address.country': { $ne: 'Nepal' },
    });

    logger.info(`Removed ${result.deletedCount} non-Nepal stations`);

    const remaining = await ChargingStation.countDocuments({});
    logger.info(`${remaining} stations remaining (all Nepal)`);

    process.exit(0);
  } catch (err) {
    logger.error(`Cleanup failed: ${err.message}`);
    process.exit(1);
  }
};

cleanup();

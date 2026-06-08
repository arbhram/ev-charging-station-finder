require('dotenv').config();
const mongoose = require('mongoose');
const { ChargingStation } = require('../models');
const logger = require('./logger');
const nepalStations = require('./nepalStations');

/**
 * Seed Nepal EV stations into MongoDB.
 * Safe to re-run — upserts by name + coordinates so duplicates are not created.
 * Usage: node backend/utils/seedNepal.js
 */
const seedNepal = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info('Connected to MongoDB');

    let inserted = 0;
    let skipped  = 0;

    for (const station of nepalStations) {
      const [lng, lat] = station.location.coordinates;
      const exists = await ChargingStation.findOne({
        'location.coordinates': { $near: { $geometry: { type: 'Point', coordinates: [lng, lat] }, $maxDistance: 50 } },
      }).catch(() => null);

      if (exists) {
        skipped++;
        continue;
      }

      await ChargingStation.create({ ...station, isActive: true });
      inserted++;
    }

    logger.info(`Done: ${inserted} inserted, ${skipped} skipped (already exist within 50 m)`);
    process.exit(0);
  } catch (err) {
    logger.error(`Seed failed: ${err.message}`);
    process.exit(1);
  }
};

seedNepal();

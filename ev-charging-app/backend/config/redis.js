const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient = null;
let isConnected = false;

const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 5) {
            logger.warn('Redis: max reconnection attempts reached — rate limiting will use in-memory fallback');
            return false; // stop retrying
          }
          return Math.min(retries * 500, 3000);
        },
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      logger.info('Redis: connected');
    });

    redisClient.on('error', (err) => {
      isConnected = false;
      logger.warn(`Redis error: ${err.message || err.code || err}`);
    });

    redisClient.on('end', () => {
      isConnected = false;
      logger.warn('Redis: disconnected');
    });

    await redisClient.connect();
  } catch (err) {
    logger.warn(`Redis: could not connect (${err.message}) — falling back to in-memory rate limiting`);
    redisClient = null;
    isConnected = false;
  }
};

const getRedisClient = () => redisClient;
const isRedisConnected = () => isConnected;

module.exports = { connectRedis, getRedisClient, isRedisConnected };

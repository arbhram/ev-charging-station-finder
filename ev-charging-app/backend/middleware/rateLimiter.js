const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const { getRedisClient, isRedisConnected } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Build a rate limiter.
 * Uses Redis store when Redis is available, falls back to in-memory automatically.
 *
 * @param {object} options
 * @param {number} options.windowMs   - Time window in milliseconds
 * @param {number} options.max        - Max requests per window
 * @param {string} options.message    - Error message shown when limited
 * @param {string} options.prefix     - Redis key prefix (keep unique per limiter)
 */
const buildLimiter = ({ windowMs, max, message, prefix }) => {
  const options = {
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: message },
    skip: (req) => {
      // Skip rate limiting for health check
      if (req.path === '/api/health') return true;
      return false;
    },
    handler: (req, res, next, options) => {
      logger.warn(`Rate limit hit: ${req.ip} on ${req.path}`);
      res.status(429).json(options.message);
    },
  };

  // Attach Redis store only if Redis is connected
  if (isRedisConnected()) {
    try {
      options.store = new RedisStore({
        sendCommand: (...args) => getRedisClient().sendCommand(args),
        prefix: `rl:${prefix}:`,
      });
      logger.info(`Rate limiter [${prefix}] using Redis store`);
    } catch (err) {
      logger.warn(`Rate limiter [${prefix}] Redis store failed — using in-memory: ${err.message}`);
    }
  }

  return rateLimit(options);
};

/**
 * LIMITERS
 * ─────────────────────────────────────────────────────────────
 * auth_login      →   5 req / 15 min   (brute-force protection)
 * auth_register   →   3 req / 60 min   (prevent fake accounts)
 * api_general     → 100 req / 1 min    (all other API routes)
 * api_stations    →  60 req / 1 min    (station queries)
 * api_admin       →  30 req / 1 min    (admin panel)
 */

const loginLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many login attempts. Please try again in 15 minutes.',
  prefix: 'auth_login',
});

const registerLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many registration attempts. Please try again in an hour.',
  prefix: 'auth_register',
});

const generalLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'Too many requests. Please slow down.',
  prefix: 'api_general',
});

const stationLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many station requests. Please wait a moment.',
  prefix: 'api_stations',
});

const adminLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many admin requests. Please slow down.',
  prefix: 'api_admin',
});

const aiLimiter = buildLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many AI requests. Please wait a moment.',
  prefix: 'api_ai',
});

module.exports = {
  loginLimiter,
  registerLimiter,
  generalLimiter,
  stationLimiter,
  adminLimiter,
  aiLimiter,
};

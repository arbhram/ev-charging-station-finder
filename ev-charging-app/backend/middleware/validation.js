const { validationResult, body, param, query } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Middleware to check validation results.
 * Returns 400 with detailed error messages if validation fails.
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg);
    throw ApiError.badRequest(messages.join('. '));
  }
  next();
};

/**
 * Validation rules for user registration.
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 50 })
    .withMessage('Name cannot exceed 50 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
];

/**
 * Validation rules for user login.
 */
const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
];

/**
 * Validation rules for charging calculation.
 */
const calculationValidation = [
  body('batteryCapacity')
    .isFloat({ min: 1 })
    .withMessage('Battery capacity must be a positive number'),
  body('currentPercent')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Current battery percentage must be between 0 and 100'),
  body('targetPercent')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Target battery percentage must be between 0 and 100'),
  body('chargerLevel')
    .isIn(['Level 1', 'Level 2', 'DC Fast Charger'])
    .withMessage('Invalid charger level'),
];

/**
 * Validation rules for station creation.
 */
const stationValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Station name is required')
    .isLength({ max: 200 }),
  body('location.coordinates')
    .isArray({ min: 2, max: 2 })
    .withMessage('Coordinates must be [longitude, latitude]'),
  body('chargerLevel')
    .isIn(['Level 1', 'Level 2', 'DC Fast Charger'])
    .withMessage('Invalid charger level'),
  body('connectors')
    .isArray({ min: 1 })
    .withMessage('At least one connector is required'),
];

/**
 * Validation for location-based queries.
 */
const locationQueryValidation = [
  query('lat')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  query('lng')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
];

/**
 * Validation for MongoDB ObjectId params.
 */
const objectIdValidation = (paramName = 'id') => [
  param(paramName).isMongoId().withMessage(`Invalid ${paramName} format`),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  calculationValidation,
  stationValidation,
  locationQueryValidation,
  objectIdValidation,
};

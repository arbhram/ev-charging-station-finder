/**
 * Centralized model exports.
 * Import all models from this single entry point.
 */
const User = require('./User');
const ChargingStation = require('./ChargingStation');
const Vehicle = require('./Vehicle');
const Notification = require('./Notification');
const Route = require('./Route');
const Report = require('./Report');

module.exports = {
  User,
  ChargingStation,
  Vehicle,
  Notification,
  Route,
  Report,
};

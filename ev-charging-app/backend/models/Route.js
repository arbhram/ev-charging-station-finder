const mongoose = require('mongoose');

/**
 * Route Schema
 * Stores user-planned routes with charging stops.
 * Captures start/end points, waypoints, and associated charging stations.
 */
const RouteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    name: {
      type: String,
      default: 'Untitled Route',
      maxlength: 100,
    },
    origin: {
      name: { type: String, required: true },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    destination: {
      name: { type: String, required: true },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    chargingStops: [
      {
        station: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ChargingStation',
        },
        stationName: { type: String },
        coordinates: { type: [Number] },
        estimatedArrivalBattery: { type: Number }, // percentage
        estimatedDepartureBattery: { type: Number },
        estimatedChargingTime: { type: Number }, // minutes
        estimatedCost: { type: Number },
        order: { type: Number },
      },
    ],
    totalDistance: {
      type: Number, // km
      default: 0,
    },
    totalDuration: {
      type: Number, // minutes
      default: 0,
    },
    totalChargingTime: {
      type: Number, // minutes
      default: 0,
    },
    totalChargingCost: {
      type: Number,
      default: 0,
    },
    vehicleUsed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },
    polyline: {
      type: String, // Encoded polyline string
      default: '',
    },
    isFavorite: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for user's routes sorted by date
RouteSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Route', RouteSchema);

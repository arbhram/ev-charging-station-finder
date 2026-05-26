const mongoose = require('mongoose');

/**
 * Vehicle Schema
 * Stores EV vehicle specifications and compatible connector types.
 * Used for charger compatibility checking and range calculations.
 */
const VehicleSchema = new mongoose.Schema(
  {
    make: {
      type: String,
      required: [true, 'Vehicle make is required'],
      trim: true,
    },
    model: {
      type: String,
      required: [true, 'Vehicle model is required'],
      trim: true,
    },
    year: {
      type: Number,
      required: [true, 'Vehicle year is required'],
      min: [2010, 'Year must be 2010 or later'],
    },
    batteryCapacity: {
      type: Number, // kWh
      required: [true, 'Battery capacity is required'],
      min: [1, 'Battery capacity must be positive'],
    },
    range: {
      type: Number, // km
      required: [true, 'Vehicle range is required'],
      min: [1, 'Range must be positive'],
    },
    efficiency: {
      type: Number, // kWh per km
      required: [true, 'Efficiency rating is required'],
    },
    compatibleConnectors: [
      {
        type: String,
        enum: [
          'Type 1',
          'Type 2',
          'CCS',
          'CCS2',
          'CHAdeMO',
          'Tesla Supercharger',
          'Tesla Destination',
          'Wall Outlet',
        ],
      },
    ],
    maxChargingSpeed: {
      ac: { type: Number, default: 0 }, // kW
      dc: { type: Number, default: 0 }, // kW
    },
    category: {
      type: String,
      enum: ['sedan', 'suv', 'hatchback', 'truck', 'van', 'other'],
      default: 'sedan',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound index for make + model lookups
VehicleSchema.index({ make: 1, model: 1, year: 1 });

// Static: Get all compatible connector types for a vehicle
VehicleSchema.statics.getCompatibleStations = async function (vehicleId) {
  const vehicle = await this.findById(vehicleId);
  if (!vehicle) {
    throw new Error('Vehicle not found');
  }
  return vehicle.compatibleConnectors;
};

module.exports = mongoose.model('Vehicle', VehicleSchema);

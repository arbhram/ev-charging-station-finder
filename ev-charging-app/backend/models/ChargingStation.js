const mongoose = require('mongoose');

/**
 * Charging Station Schema
 * Stores station details, location, connectors, pricing, and availability.
 * Supports geospatial queries for finding nearby stations.
 */
const ChargingStationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Station name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    description: {
      type: String,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: '',
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates are required'],
        validate: {
          validator: function (coords) {
            return (
              coords.length === 2 &&
              coords[0] >= -180 &&
              coords[0] <= 180 &&
              coords[1] >= -90 &&
              coords[1] <= 90
            );
          },
          message: 'Invalid coordinates. Format: [longitude, latitude]',
        },
      },
      address: {
        street: { type: String, default: '' },
        suburb: { type: String, default: '' },
        city: { type: String, default: '' },
        state: { type: String, default: '' },
        postcode: { type: String, default: '' },
        country: { type: String, default: 'Australia' },
      },
      formattedAddress: { type: String, default: '' },
    },
    operator: {
      name: { type: String, default: '' },
      website: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    connectors: [
      {
        type: {
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
            'Other',
          ],
          required: true,
        },
        powerKW: {
          type: Number,
          required: [true, 'Connector power rating is required'],
          min: [0, 'Power must be a positive number'],
        },
        quantity: {
          type: Number,
          default: 1,
          min: 1,
        },
        available: {
          type: Number,
          default: 1,
          min: 0,
        },
        status: {
          type: String,
          enum: ['available', 'occupied', 'out_of_service', 'unknown'],
          default: 'available',
        },
      },
    ],
    chargerLevel: {
      type: String,
      enum: ['Level 1', 'Level 2', 'DC Fast Charger'],
      required: [true, 'Charger level is required'],
    },
    pricing: {
      perKWh: { type: Number, default: 0 },
      perMinute: { type: Number, default: 0 },
      flatRate: { type: Number, default: 0 },
      currency: { type: String, default: 'AUD' },
      isFree: { type: Boolean, default: false },
    },
    amenities: [
      {
        type: String,
        enum: [
          'WiFi',
          'Restroom',
          'Food',
          'Shopping',
          'Parking',
          'Shelter',
          'Lighting',
          '24/7 Access',
          'Wheelchair Accessible',
        ],
      },
    ],
    operatingHours: {
      is24Hours: { type: Boolean, default: true },
      schedule: {
        monday: { open: String, close: String },
        tuesday: { open: String, close: String },
        wednesday: { open: String, close: String },
        thursday: { open: String, close: String },
        friday: { open: String, close: String },
        saturday: { open: String, close: String },
        sunday: { open: String, close: String },
      },
    },
    rating: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0 },
    },
    images: [{ type: String }],
    externalId: {
      type: String,
      default: '',
      index: true,
    },
    osmId: {
      type: String,
      sparse: true,
      index: true,
    },
    dataSource: {
      type: String,
      enum: ['manual', 'open_charge_map', 'afdc', 'other'],
      default: 'manual',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastStatusUpdate: {
      type: Date,
      default: Date.now,
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    usageStats: {
      totalSessions: { type: Number, default: 0 },
      peakHours: [{ type: Number }], // Hours 0-23
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Geospatial index for location-based queries
ChargingStationSchema.index({ 'location.coordinates': '2dsphere' });

// Text index for search functionality (name, suburb, city, state, address)
ChargingStationSchema.index({
  name: 'text',
  'location.address.suburb': 'text',
  'location.address.city': 'text',
  'location.address.state': 'text',
  'location.formattedAddress': 'text',
});

// Compound index for filtering
ChargingStationSchema.index({ chargerLevel: 1, isActive: 1 });
ChargingStationSchema.index({ 'connectors.type': 1 });

// Virtual: Check if any connector is available
ChargingStationSchema.virtual('hasAvailableConnector').get(function () {
  return this.connectors.some((c) => c.available > 0);
});

// Virtual: Maximum power output
ChargingStationSchema.virtual('maxPowerKW').get(function () {
  if (!this.connectors.length) return 0;
  return Math.max(...this.connectors.map((c) => c.powerKW));
});

// Static: Find stations near a point
ChargingStationSchema.statics.findNearby = function (
  longitude,
  latitude,
  maxDistanceMeters = 50000
) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistanceMeters,
      },
    },
    isActive: true,
  });
};

module.exports = mongoose.model('ChargingStation', ChargingStationSchema);

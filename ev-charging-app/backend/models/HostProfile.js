const mongoose = require('mongoose');

const HostProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChargingStation',
      default: null,
    },
    chargerPhotos: {
      type: [String],
      default: [],
      validate: {
        validator: (v) => v.length <= 10,
        message: 'Maximum 10 photos allowed',
      },
    },
    chargerSpecs: {
      connectorType: {
        type: String,
        enum: ['CCS2', 'GBT', 'Type2', 'Type1', 'AC_Socket', 'CHAdeMO'],
        required: [true, 'Connector type is required'],
      },
      powerKW: {
        type: Number,
        required: [true, 'Charger power is required'],
        min: [1, 'Power must be at least 1 kW'],
      },
      brand: { type: String, default: '' },
      model: { type: String, default: '' },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [lng, lat]
        required: [true, 'Location coordinates are required'],
      },
      address: {
        street:   { type: String, default: '' },
        area:     { type: String, default: '' },
        city:     { type: String, default: '' },
        province: { type: String, default: '' },
        country:  { type: String, default: 'Nepal' },
        formattedAddress: { type: String, default: '' },
      },
    },
    parkingType: {
      type: String,
      enum: ['covered', 'open', 'garage', 'street'],
      default: 'open',
    },
    amenities: {
      type: [String],
      enum: ['wifi', 'restroom', 'food', 'covered_parking', '24x7', 'security'],
      default: [],
    },
    pricing: {
      amount:   { type: Number, required: [true, 'Price is required'], min: 0 },
      currency: { type: String, default: 'NPR' },
      unit:     { type: String, default: 'kWh' },
    },
    availability: {
      schedule: [
        {
          day:       { type: String, enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] },
          startTime: { type: String }, // "08:00"
          endTime:   { type: String }, // "18:00"
        },
      ],
      blockedDates: { type: [Date], default: [] },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'suspended'],
      default: 'pending',
    },
    rejectionReason: { type: String, default: '' },
    stats: {
      totalSessions: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0, min: 0, max: 5 },
      totalReviews:  { type: Number, default: 0 },
    },
    badges: {
      type: [String],
      enum: ['verified', 'top_rated', 'super_host'],
      default: [],
    },
    whatsapp: { type: String, default: '' },
    description: { type: String, default: '', maxlength: 500 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

HostProfileSchema.index({ userId: 1 });
HostProfileSchema.index({ status: 1 });
HostProfileSchema.index({ 'stats.averageRating': -1 });
HostProfileSchema.index({ 'location.coordinates': '2dsphere' });

module.exports = mongoose.model('HostProfile', HostProfileSchema);

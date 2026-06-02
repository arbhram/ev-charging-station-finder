const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * User Schema
 * Handles authentication, profile, favorites, and search history.
 * Passwords are hashed using bcrypt before saving.
 */
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // Do not return password by default
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    avatar: {
      type: String,
      default: '',
    },
    vehicle: {
      make: { type: String, default: '' },
      model: { type: String, default: '' },
      year: { type: Number },
      batteryCapacity: { type: Number }, // in kWh
      range: { type: Number }, // in km
      connectorType: { type: String, default: '' },
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ChargingStation',
      },
    ],
    recentSearches: [
      {
        query: { type: String },
        location: {
          type: { type: String, default: 'Point' },
          coordinates: [Number],
        },
        timestamp: { type: Date, default: Date.now },
      },
    ],
    notificationPreferences: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      availabilityAlerts: { type: Boolean, default: true },
      priceAlerts: { type: Boolean, default: true },
      newStationAlerts: { type: Boolean, default: true },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    resetPasswordToken: {
      type: String,
      select: false,
    },
    resetPasswordExpire: {
      type: Date,
      select: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for geospatial queries on recent searches
UserSchema.index({ 'recentSearches.location': '2dsphere' });

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Generate JWT token
UserSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE }
  );
};

// Compare entered password with hashed password
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate a hashed password reset token, store it, return the raw token to email
UserSchema.methods.generateResetToken = function () {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes
  return rawToken;
};

// Limit recent searches to 20 entries
UserSchema.methods.addRecentSearch = function (searchData) {
  this.recentSearches.unshift(searchData);
  if (this.recentSearches.length > 20) {
    this.recentSearches = this.recentSearches.slice(0, 20);
  }
  return this.save();
};

module.exports = mongoose.model('User', UserSchema);



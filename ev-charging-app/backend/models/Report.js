const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    station: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ChargingStation',
      required: [true, 'Station reference is required'],
    },
    type: {
      type: String,
      enum: ['broken_charger', 'wrong_location', 'station_closed', 'incorrect_info', 'other'],
      required: true,
    },
    description: {
      type: String,
      maxlength: 1000,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'dismissed'],
      default: 'open',
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedNote: {
      type: String,
      maxlength: 500,
      default: '',
    },
    resolvedAt: Date,
  },
  { timestamps: true }
);

ReportSchema.index({ station: 1, status: 1 });
ReportSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Report', ReportSchema);

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['zombie_detected', 'new_api', 'security_violation', 'pii_exposure', 'auth_missing', 'rate_limit_missing'],
    required: true
  },
  severity:  { type: String, enum: ['info', 'warning', 'critical'], default: 'warning' },
  apiId:     { type: mongoose.Schema.Types.ObjectId, ref: 'API' },
  endpoint:  { type: String },
  message:   { type: String, required: true },
  details:   { type: mongoose.Schema.Types.Mixed, default: {} },
  resolved:  { type: Boolean, default: false },
  resolvedAt:{ type: Date },
  resolvedBy:{ type: String },
  notified:  { type: Boolean, default: false },
  channels:  { type: [String], default: [] }  // email, slack, jira
}, { timestamps: true });

alertSchema.index({ resolved: 1, severity: 1 });
alertSchema.index({ apiId: 1 });

module.exports = mongoose.model('Alert', alertSchema);

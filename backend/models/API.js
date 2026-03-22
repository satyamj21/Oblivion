const mongoose = require('mongoose');

const securityCheckSchema = new mongoose.Schema({
  hasAuth:        { type: Boolean, default: false },
  authType:       { type: String, enum: ['OAuth2', 'JWT', 'API_KEY', 'Basic', 'None'], default: 'None' },
  usesHTTPS:      { type: Boolean, default: false },
  hasRateLimit:   { type: Boolean, default: false },
  hasCORS:        { type: Boolean, default: false },
  exposesPII:     { type: Boolean, default: false },
  exposesFinancial: { type: Boolean, default: false },
  tlsVersion:     { type: String, default: 'unknown' },
  owaspViolations:{ type: [String], default: [] }
}, { _id: false });

const trafficStatsSchema = new mongoose.Schema({
  last24h:  { type: Number, default: 0 },
  last7d:   { type: Number, default: 0 },
  last30d:  { type: Number, default: 0 },
  lastSeen: { type: Date, default: null }
}, { _id: false });

const apiSchema = new mongoose.Schema({
  // Core identity
  endpoint:    { type: String, required: true },
  method:      { type: String, enum: ['GET','POST','PUT','PATCH','DELETE','OPTIONS','HEAD'], default: 'GET' },
  version:     { type: String, default: 'v1' },
  baseUrl:     { type: String, default: '' },
  description: { type: String, default: '' },

  // Classification
  status: {
    type: String,
    enum: ['active', 'deprecated', 'orphaned', 'zombie', 'quarantined'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['swagger', 'manual', 'network_scan', 'github', 'ci_cd', 'gateway'],
    default: 'manual'
  },

  // Ownership
  team:  { type: String, default: 'unknown' },
  owner: { type: String, default: 'unknown' },
  tags:  { type: [String], default: [] },

  // Security
  security:     { type: securityCheckSchema, default: () => ({}) },
  riskScore:    { type: Number, min: 0, max: 100, default: 0 },
  riskLevel:    { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'low' },

  // Traffic
  traffic:      { type: trafficStatsSchema, default: () => ({}) },
  daysInactive: { type: Number, default: 0 },

  // Zombie metadata
  isZombie:       { type: Boolean, default: false },
  zombieReasons:  { type: [String], default: [] },
  zombieDetectedAt: { type: Date, default: null },

  // Remediation
  recommendations: { type: [String], default: [] },
  remediationStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'resolved', 'ignored'],
    default: 'pending'
  },
  jiraTicket:  { type: String, default: null },
  isActive:    { type: Boolean, default: true },

  // Scan metadata
  lastScanned: { type: Date, default: Date.now },
  scanId:      { type: String, default: null }

}, { timestamps: true });

// ─── Index for fast queries ────────────────────────────────────
apiSchema.index({ endpoint: 1, method: 1 }, { unique: true });
apiSchema.index({ status: 1 });
apiSchema.index({ isZombie: 1 });
apiSchema.index({ riskLevel: 1 });
apiSchema.index({ team: 1 });

// ─── Virtual: full path ───────────────────────────────────────
apiSchema.virtual('fullPath').get(function () {
  return `${this.method} ${this.baseUrl}${this.endpoint}`;
});

module.exports = mongoose.model('API', apiSchema);

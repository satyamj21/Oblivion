const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  scanId:       { type: String, required: true, unique: true },
  type:         { type: String, enum: ['manual', 'scheduled', 'cicd'], default: 'manual' },
  source:       { type: String, default: 'manual' },
  status:       { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
  startedAt:    { type: Date, default: Date.now },
  completedAt:  { type: Date },
  duration:     { type: Number },  // ms

  // Results summary
  results: {
    totalFound:     { type: Number, default: 0 },
    newApis:        { type: Number, default: 0 },
    zombiesFound:   { type: Number, default: 0 },
    criticalRisks:  { type: Number, default: 0 },
    decommissioned: { type: Number, default: 0 }
  },

  // Source-specific metadata
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },

  initiatedBy: { type: String, default: 'system' },
  error:       { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Scan', scanSchema);

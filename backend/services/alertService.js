const Alert = require('../models/Alert');

async function createAlert({ type, severity, endpoint, message, details = {}, apiId = null }) {
  try {
    const alert = await Alert.create({ type, severity, endpoint, message, details, apiId });
    console.log(`🚨 Alert [${severity.toUpperCase()}]: ${message}`);
    return alert;
  } catch (err) {
    console.error('Failed to create alert:', err.message);
  }
}

async function resolveAlert(alertId, resolvedBy = 'system') {
  return Alert.findByIdAndUpdate(alertId, {
    resolved: true,
    resolvedAt: new Date(),
    resolvedBy
  }, { new: true });
}

async function getUnresolvedAlerts(severity = null) {
  const query = { resolved: false };
  if (severity) query.severity = severity;
  return Alert.find(query).sort({ createdAt: -1 });
}

module.exports = { createAlert, resolveAlert, getUnresolvedAlerts };

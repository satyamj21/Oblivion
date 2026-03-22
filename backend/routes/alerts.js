const express = require('express');
const router = express.Router();
const Alert = require('../models/Alert');
const { resolveAlert, getUnresolvedAlerts } = require('../services/alertService');

router.get('/', async (req, res, next) => {
  try {
    const { resolved, severity, limit = 20 } = req.query;
    const query = {};
    if (resolved !== undefined) query.resolved = resolved === 'true';
    if (severity) query.severity = severity;
    const alerts = await Alert.find(query).sort({ createdAt: -1 }).limit(parseInt(limit));
    res.json({ success: true, data: alerts });
  } catch (err) { next(err); }
});

router.patch('/:id/resolve', async (req, res, next) => {
  try {
    const alert = await resolveAlert(req.params.id, req.body.resolvedBy);
    res.json({ success: true, data: alert });
  } catch (err) { next(err); }
});

module.exports = router;

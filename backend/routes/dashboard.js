const express = require('express');
const router = express.Router();
const API = require('../models/API');
const Alert = require('../models/Alert');
const Scan = require('../models/Scan');

// GET /api/dashboard/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [
      total,
      active,
      deprecated,
      orphaned,
      zombie,
      quarantined,
      criticalRisk,
      highRisk,
      unresolvedAlerts,
      criticalAlerts,
      lastScan
    ] = await Promise.all([
      API.countDocuments(),
      API.countDocuments({ status: 'active' }),
      API.countDocuments({ status: 'deprecated' }),
      API.countDocuments({ status: 'orphaned' }),
      API.countDocuments({ isZombie: true }),
      API.countDocuments({ status: 'quarantined' }),
      API.countDocuments({ riskLevel: 'critical' }),
      API.countDocuments({ riskLevel: 'high' }),
      Alert.countDocuments({ resolved: false }),
      Alert.countDocuments({ resolved: false, severity: 'critical' }),
      Scan.findOne().sort({ createdAt: -1 })
    ]);

    // Average risk score
    const riskAgg = await API.aggregate([
      { $group: { _id: null, avgRisk: { $avg: '$riskScore' } } }
    ]);
    const avgRiskScore = Math.round(riskAgg[0]?.avgRisk || 0);

    // Source breakdown
    const sourceBreakdown = await API.aggregate([
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Risk distribution
    const riskDistribution = await API.aggregate([
      { $group: { _id: '$riskLevel', count: { $sum: 1 } } }
    ]);

    // Auth coverage
    const authBreakdown = await API.aggregate([
      { $group: { _id: '$security.authType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Recent alerts
    const recentAlerts = await Alert.find({ resolved: false })
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        counts: { total, active, deprecated, orphaned, zombie, quarantined },
        risk: { avgRiskScore, criticalRisk, highRisk },
        alerts: { unresolved: unresolvedAlerts, critical: criticalAlerts, recent: recentAlerts },
        lastScan: lastScan || null,
        sourceBreakdown,
        riskDistribution,
        authBreakdown
      }
    });
  } catch (err) { next(err); }
});

// GET /api/dashboard/trends — weekly trend data
router.get('/trends', async (req, res, next) => {
  try {
    // Generate trend data for the past 7 days
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const [created, zombies] = await Promise.all([
        API.countDocuments({ createdAt: { $gte: date, $lt: nextDate } }),
        API.countDocuments({ zombieDetectedAt: { $gte: date, $lt: nextDate } })
      ]);

      days.push({
        date: date.toISOString().split('T')[0],
        newApis: created,
        zombiesDetected: zombies
      });
    }

    res.json({ success: true, data: days });
  } catch (err) { next(err); }
});

module.exports = router;

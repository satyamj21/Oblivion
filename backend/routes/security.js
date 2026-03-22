const express = require('express');
const router = express.Router();
const API = require('../models/API');

// GET /api/security/posture — full security overview
router.get('/posture', async (req, res, next) => {
  try {
    const allAPIs = await API.find();
    const total = allAPIs.length;
    if (total === 0) return res.json({ success: true, data: {} });

    const withAuth = allAPIs.filter(a => a.security?.hasAuth).length;
    const withHTTPS = allAPIs.filter(a => a.security?.usesHTTPS).length;
    const withRateLimit = allAPIs.filter(a => a.security?.hasRateLimit).length;
    const withCORS = allAPIs.filter(a => a.security?.hasCORS).length;
    const exposingPII = allAPIs.filter(a => a.security?.exposesPII).length;
    const exposingFinancial = allAPIs.filter(a => a.security?.exposesFinancial).length;

    // OWASP violation summary
    const owaspCount = {};
    allAPIs.forEach(api => {
      (api.security?.owaspViolations || []).forEach(v => {
        const key = v.split(' - ')[0];
        owaspCount[key] = (owaspCount[key] || 0) + 1;
      });
    });

    res.json({
      success: true,
      data: {
        total,
        authentication: {
          covered: withAuth,
          percentage: Math.round((withAuth / total) * 100),
          byType: {
            OAuth2: allAPIs.filter(a => a.security?.authType === 'OAuth2').length,
            JWT: allAPIs.filter(a => a.security?.authType === 'JWT').length,
            API_KEY: allAPIs.filter(a => a.security?.authType === 'API_KEY').length,
            Basic: allAPIs.filter(a => a.security?.authType === 'Basic').length,
            None: allAPIs.filter(a => a.security?.authType === 'None').length,
          }
        },
        transport: { https: withHTTPS, percentage: Math.round((withHTTPS / total) * 100) },
        rateLimit: { covered: withRateLimit, percentage: Math.round((withRateLimit / total) * 100) },
        cors: { covered: withCORS, percentage: Math.round((withCORS / total) * 100) },
        dataExposure: { pii: exposingPII, financial: exposingFinancial },
        owaspViolations: owaspCount
      }
    });
  } catch (err) { next(err); }
});

// GET /api/security/violations — APIs with OWASP violations
router.get('/violations', async (req, res, next) => {
  try {
    const apis = await API.find({ 'security.owaspViolations.0': { $exists: true } })
      .select('endpoint method riskScore riskLevel security.owaspViolations status')
      .sort({ riskScore: -1 });
    res.json({ success: true, data: apis });
  } catch (err) { next(err); }
});

module.exports = router;

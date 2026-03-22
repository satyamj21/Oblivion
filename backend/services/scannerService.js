/**
 * ZombieGuard — Scanner Service
 *
 * Handles:
 *  1. Swagger/OpenAPI file parsing
 *  2. Manual endpoint list ingestion
 *  3. Express route auto-detection (for local servers)
 *  4. Scheduled background scans
 */

const yaml = require('js-yaml');
const { v4: uuidv4 } = require('uuid');
const API = require('../models/API');
const Scan = require('../models/Scan');
const { analyzeAPI } = require('./classificationService');
const { createAlert } = require('./alertService');

// ─── Parse Swagger 2.0 / OpenAPI 3.x ─────────────────────────
function parseSwaggerSpec(content) {
  let spec;
  try {
    // Try JSON first, fallback to YAML
    spec = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    spec = yaml.load(content);
  }

  const endpoints = [];
  const baseUrl = spec.servers?.[0]?.url || spec.host || '';
  const basePath = spec.basePath || '';

  const paths = spec.paths || {};

  Object.entries(paths).forEach(([path, pathItem]) => {
    const httpMethods = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'];

    httpMethods.forEach(method => {
      if (!pathItem[method]) return;

      const operation = pathItem[method];
      const security = operation.security || spec.security || [];
      const hasAuth = security.length > 0;

      // Detect auth type from security schemes
      let authType = 'None';
      if (hasAuth) {
        const secDef = spec.components?.securitySchemes || spec.securityDefinitions || {};
        const secKey = Object.keys(security[0] || {})[0];
        const scheme = secDef[secKey];
        if (scheme?.type === 'oauth2') authType = 'OAuth2';
        else if (scheme?.type === 'apiKey') authType = 'API_KEY';
        else if (scheme?.bearerFormat === 'JWT' || scheme?.scheme === 'bearer') authType = 'JWT';
        else if (scheme?.scheme === 'basic') authType = 'Basic';
      }

      // Detect PII/financial data in response schemas
      const responseSchema = JSON.stringify(operation.responses || {}).toLowerCase();
      const exposesPII = /ssn|aadhaar|pan|passport|dob|date_of_birth|address|phone|email/.test(responseSchema);
      const exposesFinancial = /account_number|card_number|cvv|balance|transaction/.test(responseSchema);

      // Detect rate limit from extensions
      const hasRateLimit = !!(operation['x-rate-limit'] || operation['x-throttling']);

      endpoints.push({
        endpoint: path,
        method: method.toUpperCase(),
        version: spec.info?.version || 'v1',
        baseUrl: baseUrl + basePath,
        description: operation.summary || operation.description || '',
        tags: operation.tags || [],
        security: {
          hasAuth,
          authType,
          usesHTTPS: baseUrl.startsWith('https') || true, // assume HTTPS for swagger
          hasRateLimit,
          hasCORS: false, // needs runtime check
          exposesPII,
          exposesFinancial
        },
        source: 'swagger'
      });
    });
  });

  return endpoints;
}

// ─── Parse a plain text list of endpoints ─────────────────────
function parseEndpointList(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map(line => {
    // Supports: "GET /api/users" or just "/api/users"
    const parts = line.split(/\s+/);
    const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
    let method = 'GET';
    let endpoint = line;

    if (parts.length >= 2 && httpMethods.includes(parts[0].toUpperCase())) {
      method = parts[0].toUpperCase();
      endpoint = parts[1];
    }

    return {
      endpoint,
      method,
      source: 'manual',
      security: {
        hasAuth: false,
        authType: 'None',
        usesHTTPS: false,
        hasRateLimit: false,
        hasCORS: false,
        exposesPII: false,
        exposesFinancial: false
      }
    };
  });
}

// ─── Simulate a network traffic scan (mock for demo) ──────────
function generateMockTrafficData() {
  const now = new Date();

  // Randomly simulate different traffic patterns
  const patterns = [
    // Active API
    () => ({
      last24h: Math.floor(Math.random() * 5000) + 100,
      last7d: Math.floor(Math.random() * 30000) + 700,
      last30d: Math.floor(Math.random() * 120000) + 3000,
      lastSeen: new Date(now - Math.random() * 3600000) // within last hour
    }),
    // Deprecated (low but some traffic)
    () => ({
      last24h: Math.floor(Math.random() * 20),
      last7d: Math.floor(Math.random() * 100),
      last30d: Math.floor(Math.random() * 300),
      lastSeen: new Date(now - Math.random() * 7 * 86400000)
    }),
    // Zombie (no traffic)
    () => ({
      last24h: 0,
      last7d: 0,
      last30d: 0,
      lastSeen: new Date(now - (31 + Math.random() * 60) * 86400000) // 31–90 days ago
    })
  ];

  const rand = Math.random();
  if (rand < 0.6) return patterns[0]();
  if (rand < 0.85) return patterns[1]();
  return patterns[2]();
}

// ─── Save APIs to database after scanning ─────────────────────
async function saveScannedAPIs(endpoints, scanId) {
  const results = { saved: 0, updated: 0, zombiesFound: 0, errors: 0 };

  for (const ep of endpoints) {
    try {
      // Assign mock traffic for demo (replace with real traffic data in production)
      const traffic = ep.traffic || generateMockTrafficData();
      const owner = ep.owner || ['payments-team', 'auth-team', 'accounts-team', 'unknown'][Math.floor(Math.random() * 4)];

      // Run analysis
      const analysis = analyzeAPI({ ...ep, traffic, owner });

      const apiData = {
        ...ep,
        ...analysis,
        traffic,
        owner,
        scanId,
        lastScanned: new Date()
      };

      const existing = await API.findOne({ endpoint: ep.endpoint, method: ep.method });

      if (existing) {
        await API.findByIdAndUpdate(existing._id, apiData);
        results.updated++;
      } else {
        await API.create(apiData);
        results.saved++;
      }

      // Fire alert for newly discovered zombies
      if (analysis.isZombie) {
        results.zombiesFound++;
        await createAlert({
          type: 'zombie_detected',
          severity: analysis.riskLevel === 'critical' ? 'critical' : 'warning',
          endpoint: ep.endpoint,
          message: `Zombie API detected: ${ep.method} ${ep.endpoint}`,
          details: { reasons: analysis.zombieReasons, riskScore: analysis.riskScore }
        });
      }

      // Alert for critical security violations
      if (!ep.security?.hasAuth && analysis.riskScore >= 70) {
        await createAlert({
          type: 'auth_missing',
          severity: 'critical',
          endpoint: ep.endpoint,
          message: `Unauthenticated high-risk API: ${ep.method} ${ep.endpoint}`,
          details: { riskScore: analysis.riskScore }
        });
      }

    } catch (err) {
      console.error(`Error processing ${ep.endpoint}:`, err.message);
      results.errors++;
    }
  }

  return results;
}

// ─── Full scan pipeline ───────────────────────────────────────
async function runScan({ type = 'manual', source = 'manual', content, initiatedBy = 'user' }) {
  const scanId = uuidv4();
  const scan = await Scan.create({ scanId, type, source, initiatedBy });

  try {
    let endpoints = [];

    if (source === 'swagger' && content) {
      endpoints = parseSwaggerSpec(content);
    } else if (source === 'manual' && content) {
      endpoints = parseEndpointList(content);
    } else {
      // Default: generate sample banking API endpoints for demo
      endpoints = generateSampleBankingAPIs();
    }

    const saveResults = await saveScannedAPIs(endpoints, scanId);

    const completedAt = new Date();
    await Scan.findByIdAndUpdate(scan._id, {
      status: 'completed',
      completedAt,
      duration: completedAt - scan.startedAt,
      results: {
        totalFound: endpoints.length,
        newApis: saveResults.saved,
        zombiesFound: saveResults.zombiesFound,
        criticalRisks: 0
      }
    });

    return { scanId, ...saveResults, total: endpoints.length };

  } catch (err) {
    await Scan.findByIdAndUpdate(scan._id, { status: 'failed', error: err.message });
    throw err;
  }
}

// ─── Scheduled scan (called by cron) ─────────────────────────
async function runScheduledScan() {
  try {
    await runScan({ type: 'scheduled', source: 'gateway', initiatedBy: 'system' });
    console.log('✅ Scheduled scan completed');
  } catch (err) {
    console.error('❌ Scheduled scan failed:', err.message);
  }
}

// ─── Sample banking APIs for demo purposes ────────────────────
function generateSampleBankingAPIs() {
  return [
    // Active APIs
    { endpoint: '/api/v3/payments/transfer', method: 'POST', version: 'v3', description: 'Initiate fund transfer', source: 'gateway', security: { hasAuth: true, authType: 'OAuth2', usesHTTPS: true, hasRateLimit: true, hasCORS: true, exposesPII: false, exposesFinancial: true }, owner: 'payments-team', tags: ['payments', 'core'] },
    { endpoint: '/api/v3/accounts/balance', method: 'GET', version: 'v3', description: 'Get account balance', source: 'gateway', security: { hasAuth: true, authType: 'JWT', usesHTTPS: true, hasRateLimit: true, hasCORS: true, exposesPII: false, exposesFinancial: true }, owner: 'accounts-team', tags: ['accounts'] },
    { endpoint: '/api/v3/auth/login', method: 'POST', version: 'v3', description: 'User authentication', source: 'gateway', security: { hasAuth: false, authType: 'None', usesHTTPS: true, hasRateLimit: true, hasCORS: true, exposesPII: false, exposesFinancial: false }, owner: 'auth-team', tags: ['auth'] },
    { endpoint: '/api/v3/customers/profile', method: 'GET', version: 'v3', description: 'Get customer profile', source: 'github', security: { hasAuth: true, authType: 'JWT', usesHTTPS: true, hasRateLimit: true, hasCORS: false, exposesPII: true, exposesFinancial: false }, owner: 'accounts-team', tags: ['customers'] },
    { endpoint: '/api/v3/loans/apply', method: 'POST', version: 'v3', description: 'Loan application submission', source: 'gateway', security: { hasAuth: true, authType: 'OAuth2', usesHTTPS: true, hasRateLimit: true, hasCORS: true, exposesPII: true, exposesFinancial: true }, owner: 'loans-team', tags: ['loans'] },
    { endpoint: '/api/v3/notifications/push', method: 'POST', version: 'v3', description: 'Send push notifications', source: 'ci_cd', security: { hasAuth: true, authType: 'API_KEY', usesHTTPS: true, hasRateLimit: true, hasCORS: false, exposesPII: false, exposesFinancial: false }, owner: 'platform-team' },

    // Deprecated APIs
    { endpoint: '/api/v2/customers/export', method: 'GET', version: 'v2', description: 'Export customer data (deprecated)', source: 'gateway', security: { hasAuth: true, authType: 'Basic', usesHTTPS: true, hasRateLimit: false, hasCORS: false, exposesPII: true, exposesFinancial: true }, status: 'deprecated', owner: 'accounts-team', tags: ['deprecated'] },
    { endpoint: '/api/v2/payments/process', method: 'POST', version: 'v2', description: 'Old payment processor', source: 'gateway', security: { hasAuth: true, authType: 'API_KEY', usesHTTPS: true, hasRateLimit: false, hasCORS: false, exposesPII: false, exposesFinancial: true }, status: 'deprecated', owner: 'payments-team' },
    { endpoint: '/api/v1/auth/token', method: 'POST', version: 'v1', description: 'Legacy token endpoint', source: 'gateway', security: { hasAuth: false, authType: 'None', usesHTTPS: false, hasRateLimit: false, hasCORS: false, exposesPII: false, exposesFinancial: false }, status: 'deprecated', owner: 'auth-team' },

    // Zombie APIs (the stars of the show)
    { endpoint: '/api/v1/internal/accounts', method: 'GET', version: 'v1', description: '', source: 'network_scan', security: { hasAuth: false, authType: 'None', usesHTTPS: false, hasRateLimit: false, hasCORS: false, exposesPII: true, exposesFinancial: true }, owner: 'unknown', traffic: { last24h: 0, last7d: 0, last30d: 0, lastSeen: new Date(Date.now() - 97 * 86400000) } },
    { endpoint: '/api/legacy/v0/auth', method: 'POST', version: 'v0', description: '', source: 'network_scan', security: { hasAuth: false, authType: 'None', usesHTTPS: false, hasRateLimit: false, hasCORS: false, exposesPII: false, exposesFinancial: false }, owner: 'unknown', traffic: { last24h: 0, last7d: 0, last30d: 0, lastSeen: new Date(Date.now() - 63 * 86400000) } },
    { endpoint: '/internal/diag/ping', method: 'GET', version: 'v1', description: '', source: 'network_scan', security: { hasAuth: false, authType: 'None', usesHTTPS: false, hasRateLimit: false, hasCORS: false, exposesPII: false, exposesFinancial: false }, owner: 'unknown', traffic: { last24h: 0, last7d: 0, last30d: 0, lastSeen: null } },
    { endpoint: '/api/v2/admin/users/dump', method: 'GET', version: 'v2', description: '', source: 'github', security: { hasAuth: false, authType: 'None', usesHTTPS: true, hasRateLimit: false, hasCORS: false, exposesPII: true, exposesFinancial: false }, owner: 'unknown', traffic: { last24h: 0, last7d: 0, last30d: 0, lastSeen: new Date(Date.now() - 45 * 86400000) } },
    { endpoint: '/api/v1/reports/full-export', method: 'GET', version: 'v1', description: 'Full data export', source: 'ci_cd', security: { hasAuth: true, authType: 'API_KEY', usesHTTPS: true, hasRateLimit: false, hasCORS: false, exposesPII: true, exposesFinancial: true }, owner: 'reporting-team', traffic: { last24h: 0, last7d: 0, last30d: 0, lastSeen: new Date(Date.now() - 52 * 86400000) } }
  ];
}

module.exports = {
  runScan,
  runScheduledScan,
  parseSwaggerSpec,
  parseEndpointList,
  saveScannedAPIs,
  generateSampleBankingAPIs
};

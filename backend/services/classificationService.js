/**
 * ZombieGuard — Classification & Zombie Detection Service
 *
 * Logic:
 *  1. Classify API as active / deprecated / orphaned / zombie
 *  2. Compute risk score (0–100)
 *  3. Generate remediation recommendations
 *  4. Detect OWASP API Top 10 violations
 */

const ZOMBIE_THRESHOLD_DAYS = parseInt(process.env.ZOMBIE_THRESHOLD_DAYS) || 30;
const ORPHAN_THRESHOLD_DAYS = parseInt(process.env.ORPHAN_THRESHOLD_DAYS) || 14;

// ─── OWASP API Top 10 checks ──────────────────────────────────
function checkOWASP(api) {
  const violations = [];

  // API1 - Broken Object Level Authorization
  if (!api.security?.hasAuth) {
    violations.push('API1:2023 - No object-level authorization');
  }

  // API2 - Broken Authentication
  if (api.security?.authType === 'None' || !api.security?.hasAuth) {
    violations.push('API2:2023 - Broken/missing authentication');
  }

  // API3 - Broken Object Property Level Authorization (PII exposure)
  if (api.security?.exposesPII || api.security?.exposesFinancial) {
    violations.push('API3:2023 - Excessive data exposure (PII/financial)');
  }

  // API4 - Unrestricted Resource Consumption
  if (!api.security?.hasRateLimit) {
    violations.push('API4:2023 - No rate limiting configured');
  }

  // API7 - Server Side Request Forgery
  if (!api.security?.usesHTTPS) {
    violations.push('API7:2023 - Insecure transport (no HTTPS)');
  }

  // API8 - Security Misconfiguration
  if (!api.security?.hasCORS) {
    violations.push('API8:2023 - Missing CORS policy');
  }

  return violations;
}

// ─── Risk score calculator (0–100) ───────────────────────────
function computeRiskScore(api, owaspViolations) {
  let score = 0;

  // Authentication (30 pts)
  if (!api.security?.hasAuth) score += 30;
  else if (api.security?.authType === 'API_KEY') score += 10;
  else if (api.security?.authType === 'Basic') score += 20;

  // Transport (15 pts)
  if (!api.security?.usesHTTPS) score += 15;

  // Data exposure (25 pts)
  if (api.security?.exposesPII) score += 15;
  if (api.security?.exposesFinancial) score += 10;

  // Rate limiting (10 pts)
  if (!api.security?.hasRateLimit) score += 10;

  // OWASP violations (1 pt each, max 10)
  score += Math.min(owaspViolations.length, 10);

  // Zombie/orphan amplifier
  if (api.isZombie) score = Math.min(score * 1.3, 100);
  if (api.status === 'orphaned') score = Math.min(score * 1.1, 100);

  return Math.round(Math.min(score, 100));
}

// ─── Risk level from score ─────────────────────────────────────
function getRiskLevel(score) {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

// ─── Zombie detection logic ───────────────────────────────────
function detectZombie(api) {
  const reasons = [];
  let isZombie = false;

  const lastSeen = api.traffic?.lastSeen ? new Date(api.traffic.lastSeen) : null;
  const now = new Date();
  const daysSinceLastSeen = lastSeen
    ? Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24))
    : 9999;

  // Rule 1: No traffic for threshold days but endpoint still live
  if (daysSinceLastSeen >= ZOMBIE_THRESHOLD_DAYS || api.traffic?.last30d === 0) {
    reasons.push(`No traffic for ${daysSinceLastSeen === 9999 ? '30+' : daysSinceLastSeen} days`);
    isZombie = true;
  }

  // Rule 2: Marked deprecated but still accessible
  if (api.status === 'deprecated' && api.isActive) {
    reasons.push('Marked deprecated but still publicly accessible');
    isZombie = true;
  }

  // Rule 3: No owner assigned
  if (!api.owner || api.owner === 'unknown') {
    reasons.push('No owner assigned (orphaned)');
  }

  // Rule 4: No documentation
  if (!api.description || api.description.trim() === '') {
    reasons.push('No documentation or description');
  }

  return { isZombie, reasons, daysInactive: daysSinceLastSeen === 9999 ? 0 : daysSinceLastSeen };
}

// ─── Classification ───────────────────────────────────────────
function classifyAPI(api) {
  const lastSeen = api.traffic?.lastSeen ? new Date(api.traffic.lastSeen) : null;
  const now = new Date();
  const daysSince = lastSeen ? Math.floor((now - lastSeen) / (1000 * 60 * 60 * 24)) : 9999;

  if (api.status === 'quarantined') return 'quarantined';
  if (api.isZombie) return 'zombie';
  if (daysSince >= ZOMBIE_THRESHOLD_DAYS) return 'zombie';
  if (daysSince >= ORPHAN_THRESHOLD_DAYS || !api.owner || api.owner === 'unknown') return 'orphaned';
  if (api.status === 'deprecated') return 'deprecated';
  if (api.traffic?.last7d > 0 || api.traffic?.last24h > 0) return 'active';
  return 'orphaned';
}

// ─── Recommendation engine ────────────────────────────────────
function generateRecommendations(api, owaspViolations, isZombie) {
  const recs = [];

  if (isZombie) {
    recs.push('🔥 IMMEDIATE: Decommission this zombie API — it has no traffic and poses security risk');
    recs.push('Run dependency check before removal to ensure no hidden callers');
  }

  if (!api.security?.hasAuth) {
    recs.push('Add OAuth 2.0 or JWT authentication immediately — endpoint is publicly accessible without auth');
  } else if (api.security?.authType === 'API_KEY') {
    recs.push('Upgrade from API key to OAuth 2.0 for better security');
  } else if (api.security?.authType === 'Basic') {
    recs.push('Replace Basic Auth with JWT or OAuth 2.0 — Basic Auth is insecure over any network');
  }

  if (!api.security?.usesHTTPS) {
    recs.push('Enforce HTTPS/TLS 1.2+ — all API traffic must be encrypted in transit');
  }

  if (!api.security?.hasRateLimit) {
    recs.push('Implement rate limiting (e.g., 100 req/min per IP) to prevent abuse and DoS attacks');
  }

  if (api.security?.exposesPII) {
    recs.push('Audit PII data fields in response — mask or remove sensitive fields (Aadhaar, PAN, SSN)');
  }

  if (api.security?.exposesFinancial) {
    recs.push('Apply field-level encryption for financial data (account numbers, balances)');
  }

  if (!api.security?.hasCORS) {
    recs.push('Configure explicit CORS policy — restrict allowed origins to known domains only');
  }

  if (!api.owner || api.owner === 'unknown') {
    recs.push('Assign an API owner and team — unowned APIs become security liabilities');
  }

  if (!api.description || api.description.trim() === '') {
    recs.push('Add API documentation — undocumented APIs are harder to audit and decommission safely');
  }

  // OWASP-specific recs
  owaspViolations.forEach(v => {
    if (v.includes('API3') && !recs.some(r => r.includes('PII'))) {
      recs.push('Implement response filtering to prevent over-exposure of sensitive data');
    }
  });

  return recs;
}

// ─── Main analyzeAPI function ─────────────────────────────────
function analyzeAPI(apiData) {
  const owaspViolations = checkOWASP(apiData);
  const { isZombie, reasons: zombieReasons, daysInactive } = detectZombie(apiData);
  const status = classifyAPI({ ...apiData, isZombie });
  const riskScore = computeRiskScore({ ...apiData, isZombie, status }, owaspViolations);
  const riskLevel = getRiskLevel(riskScore);
  const recommendations = generateRecommendations(apiData, owaspViolations, isZombie);

  return {
    status,
    isZombie,
    zombieReasons,
    daysInactive,
    riskScore,
    riskLevel,
    recommendations,
    security: {
      ...apiData.security,
      owaspViolations
    }
  };
}

module.exports = {
  analyzeAPI,
  detectZombie,
  classifyAPI,
  computeRiskScore,
  getRiskLevel,
  checkOWASP,
  generateRecommendations,
  ZOMBIE_THRESHOLD_DAYS
};

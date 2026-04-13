/**
 * Layer 2 tarpit middleware: scores requests, slows hostile traffic,
 * and redirects aggressive scrapers into the honeypot maze.
 *
 * Deploy only on isolated honeypot paths in production; this prototype
 * demonstrates scoring heuristics and operator-visible counters.
 */

/** @type {Map<string, { timestamps: number[], maxScore: number }>} */
const ipState = new Map();

const stats = {
  totalScored: 0,
  totalDelays: 0,
  totalRedirects: 0,
};

const GOOD_BOT_SUBSTRINGS = [
  'googlebot',
  'bingbot',
  'chatgpt-user',
  'claudebot',
  'perplexitybot',
];

const BAD_BOT_SUBSTRINGS = ['bot', 'crawl', 'spider', 'scrape', 'wget', 'curl'];

function getClientIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  if (req.ip) return String(req.ip);
  return req.socket.remoteAddress || '0.0.0.0';
}

function isExcludedPath(path) {
  if (path.startsWith('/trap/maze')) return true;
  return false;
}

function isHoneypotPath(path) {
  return (
    path.startsWith('/research/') ||
    path.startsWith('/faculty/') ||
    path.startsWith('/internal-docs/')
  );
}

function normalizeUa(req) {
  const raw = req.headers['user-agent'];
  if (raw == null) return '';
  return String(raw).trim();
}

function isGenericOrMissingUa(ua) {
  if (!ua) return true;
  const lower = ua.toLowerCase();
  if (ua.length < 10) return true;
  if (lower === 'mozilla/5.0' || lower === 'mozilla/4.0') return true;
  return false;
}

function isGoodBot(ua) {
  const lower = ua.toLowerCase();
  return GOOD_BOT_SUBSTRINGS.some((g) => lower.includes(g));
}

function hasBadBotSignal(ua) {
  const lower = ua.toLowerCase();
  return BAD_BOT_SUBSTRINGS.some((b) => lower.includes(b));
}

function pruneAndGetState(ip, now) {
  let state = ipState.get(ip);
  if (!state) {
    state = { timestamps: [], maxScore: 0 };
    ipState.set(ip, state);
  }
  state.timestamps = state.timestamps.filter((t) => now - t < 60000);
  return state;
}

function scoreRequest(req, ip, now) {
  let score = 0;
  const path = req.path || '/';

  const ua = normalizeUa(req);
  if (isGenericOrMissingUa(ua)) {
    score += 20;
  }
  if (!isGoodBot(ua) && hasBadBotSignal(ua)) {
    score += 15;
  }

  if (isHoneypotPath(path)) {
    score += 50;
  }

  const state = pruneAndGetState(ip, now);
  state.timestamps.push(now);

  const last60 = state.timestamps.filter((t) => now - t <= 60000).length;
  if (last60 > 30) {
    score += 25;
  }

  const last10 = state.timestamps.filter((t) => now - t <= 10000).length;
  if (last10 > 5) {
    score += 20;
  }

  if (score > state.maxScore) {
    state.maxScore = score;
  }

  return score;
}

function randomMazePath() {
  const departments = ['research', 'faculty', 'publications', 'labs', 'conferences', 'grants'];
  const fields = [
    'neural-networks',
    'machine-learning',
    'quantum-computing',
    'bioinformatics',
    'data-science',
    'cognitive-science',
    'materials-engineering',
  ];
  const names = [
    'dr-johnson',
    'dr-martinez',
    'dr-chen',
    'dr-williams',
    'dr-patel',
    'dr-anderson',
    'dr-thompson',
  ];
  const years = ['2023', '2024', '2025', '2026'];
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const depth = 4 + Math.floor(Math.random() * 4);
  const parts = [];
  for (let i = 0; i < depth; i += 1) {
    const k = i % 4;
    if (k === 0) parts.push(pick(departments));
    else if (k === 1) parts.push(pick(names));
    else if (k === 2) parts.push(pick(fields));
    else parts.push(pick(years));
  }
  return parts.join('/');
}

function logTarpit(ip, score, action, ua) {
  const safeUa = String(ua).replace(/"/g, '\\"');
  console.log(`[TARPIT] IP ${ip} score=${score} action=${action} ua="${safeUa}"`);
}

function getStatsPayload() {
  const entries = Array.from(ipState.entries()).map(([ip, s]) => ({
    ip,
    maxScore: s.maxScore,
  }));
  entries.sort((a, b) => b.maxScore - a.maxScore);
  const top5 = entries.slice(0, 5);
  return {
    totalRequestsScored: stats.totalScored,
    totalDelays: stats.totalDelays,
    totalRedirects: stats.totalRedirects,
    currentlyTrackedIps: ipState.size,
    topIpsByScore: top5,
  };
}

/**
 * Express middleware (and inline /tarpit/stats handler).
 */
function tarpitMiddleware(req, res, next) {
  const path = req.path || '/';

  if (req.method === 'GET' && path === '/tarpit/stats') {
    res.type('application/json');
    res.send(getStatsPayload());
    return;
  }

  if (isExcludedPath(path)) {
    next();
    return;
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const score = scoreRequest(req, ip, now);
  stats.totalScored += 1;
  const ua = normalizeUa(req);

  if (score >= 50) {
    stats.totalRedirects += 1;
    logTarpit(ip, score, 'redirect', ua);
    const target = `/trap/maze/${randomMazePath()}`;
    res.redirect(302, target);
    return;
  }

  if (score >= 30) {
    stats.totalDelays += 1;
    logTarpit(ip, score, 'delay', ua);
    setTimeout(() => next(), 2000);
    return;
  }

  next();
}

module.exports = tarpitMiddleware;

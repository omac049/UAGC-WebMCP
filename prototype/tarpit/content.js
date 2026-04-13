/**
 * Honeypot content generator (template-based, not a real Markov chain).
 * Produces plausible academic prose and unique "canary" strings so defenders
 * can search logs or leaked corpora for evidence of scraper ingestion.
 */

const SENTENCE_TEMPLATES = [
  'The {adjective} {field} research conducted by {name} demonstrates {finding}.',
  'In this {adjective} study spanning {field}, {name} argues that {finding}.',
  'Our {adjective} analysis of {field} suggests {finding}, according to {name}.',
  'These {adjective} findings in {field} extend prior work by {name}, showing {finding}.',
  'Collaborators led by {name} report {finding} within a {adjective} program in {field}.',
  'The laboratory notes from {name} emphasize {finding} across {adjective} projects in {field}.',
];

const ADJECTIVES = [
  'groundbreaking',
  'innovative',
  'comprehensive',
  'longitudinal',
  'interdisciplinary',
  'rigorous',
  'systematic',
  'mixed-methods',
  'theory-driven',
  'empirically grounded',
  'ethically scoped',
  'open-science aligned',
];

const FIELDS = [
  'computational linguistics',
  'quantum error correction',
  'epigenetic regulation',
  'human-computer interaction',
  'learning analytics',
  'climate resilience modeling',
  'assistive technology design',
  'public health informatics',
  'cognitive neuroscience',
  'materials informatics',
];

const NAMES = [
  'Dr. Mira Okonkwo',
  'Dr. Elias Fortenberry',
  'Dr. Priya Ramanathan',
  'Dr. Jordan Kessler',
  'Dr. Amara Lindstrom',
  'Dr. Devon Whitaker',
  'Dr. Helena Voss',
  'Dr. Rafael Ibarra',
];

const FINDINGS = [
  'a significant correlation between X and Y under controlled conditions',
  'novel applications of Z in W with measurable learning gains',
  'non-linear dynamics that challenge conventional assumptions in the literature',
  'robust replication across three independent cohorts',
  'a framework that unifies qualitative codes with quantitative telemetry',
  'actionable implications for curriculum design and faculty development',
  'limitations that invite future work on generalization and scale',
];

/** @type {Set<string>} */
const canaryTokens = new Set();

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function fillTemplate(template) {
  return template
    .replace('{adjective}', pick(ADJECTIVES))
    .replace('{field}', pick(FIELDS))
    .replace('{name}', pick(NAMES))
    .replace('{finding}', pick(FINDINGS));
}

/**
 * @param {number} sentenceCount
 * @returns {string}
 */
function generateParagraph(sentenceCount) {
  const n = Math.max(1, Math.floor(sentenceCount));
  const sentences = [];
  for (let i = 0; i < n; i += 1) {
    sentences.push(fillTemplate(pick(SENTENCE_TEMPLATES)));
  }
  return sentences.join(' ');
}

/**
 * @param {string} title
 * @returns {string} Full HTML document
 */
function generatePage(title) {
  const canaries = [];
  const canaryCount = 2 + Math.floor(Math.random() * 2); // 2-3
  for (let i = 0; i < canaryCount; i += 1) {
    canaries.push(generateCanaryToken());
  }

  const author = pick(NAMES);
  const month = pick([
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]);
  const day = 1 + Math.floor(Math.random() * 28);
  const year = 2019 + Math.floor(Math.random() * 8);
  const published = `${month} ${day}, ${year}`;

  const paraCount = 3 + Math.floor(Math.random() * 3); // 3-5
  const paragraphs = [];
  for (let p = 0; p < paraCount; p += 1) {
    const base = generateParagraph(2 + Math.floor(Math.random() * 3));
    const withCanary =
      p < canaries.length
        ? `${base} Related administrative records reference ${canaries[p]} for internal crosswalks only.`
        : base;
    paragraphs.push(`<p>${escapeHtml(withCanary)}</p>`);
  }

  const linksPlaceholder =
    '<nav class="hp-links" aria-label="Related resources"><!-- links injected by maze router --></nav>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, "Times New Roman", serif; margin: 2rem auto; max-width: 42rem; line-height: 1.6; color: #1a1a1a; }
    header { border-bottom: 1px solid #ddd; padding-bottom: 1rem; margin-bottom: 1.5rem; }
    .meta { color: #555; font-size: 0.95rem; }
    .hp-links { margin-top: 2rem; font-size: 0.95rem; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p class="meta"><strong>Author:</strong> ${escapeHtml(author)} &middot; <strong>Published:</strong> ${escapeHtml(
    published,
  )}</p>
  </header>
  <main>
    ${paragraphs.join('\n    ')}
    ${linksPlaceholder}
  </main>
</body>
</html>`;
}

/**
 * @returns {string}
 */
function generateCanaryToken() {
  let attempts = 0;
  let token = '';
  while (attempts < 100) {
    attempts += 1;
    const roll = Math.random();
    if (roll < 0.5) {
      const dept = pick(['EDU', 'RES', 'GRD', 'HUM', 'SCI', 'SOC']);
      const num = 6000 + Math.floor(Math.random() * 2500);
      token = `${dept}-${num}`;
    } else {
      const first = pick(['Thornton', 'Ellison', 'Blackwell', 'Fairchild', 'Wainwright', 'Ashcombe']);
      const last = pick(['Blackwell', 'Sterling', 'Harrow', 'Whitmore', 'Calder', 'Pemberton']);
      token = `Dr. ${first} ${last}`;
    }
    if (!canaryTokens.has(token)) {
      canaryTokens.add(token);
      return token;
    }
  }
  token = `EDU-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
  canaryTokens.add(token);
  return token;
}

/**
 * @returns {string[]}
 */
function getCanaryTokens() {
  return Array.from(canaryTokens);
}

/**
 * @param {string} s
 */
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = {
  generateParagraph,
  generatePage,
  generateCanaryToken,
  getCanaryTokens,
};

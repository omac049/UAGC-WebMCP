/**
 * Tarpit "maze" router: infinite-looking crawl space with slow, chunked responses.
 * Mount on Express with: app.use('/trap/maze', require('./tarpit/maze'))
 */

const express = require('express');
const content = require('./content');

const router = express.Router();

const DEPARTMENTS = [
  'research',
  'faculty',
  'publications',
  'labs',
  'conferences',
  'grants',
];

const FIELDS = [
  'neural-networks',
  'machine-learning',
  'quantum-computing',
  'bioinformatics',
  'data-science',
  'cognitive-science',
  'materials-engineering',
];

const NAMES = [
  'dr-johnson',
  'dr-martinez',
  'dr-chen',
  'dr-williams',
  'dr-patel',
  'dr-anderson',
  'dr-thompson',
];

const YEARS = ['2023', '2024', '2025', '2026'];

let mazePagesServed = 0;
let totalTimeWastedMs = 0;

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Builds a plausible academic-style path (no leading slash; relative to /trap/maze/).
 * @returns {string}
 */
function randomMazeSegments() {
  const depth = 4 + Math.floor(Math.random() * 5); // 4-8 segments
  const parts = [];
  for (let i = 0; i < depth; i += 1) {
    const kind = i % 4;
    if (kind === 0) parts.push(pick(DEPARTMENTS));
    else if (kind === 1) parts.push(pick(NAMES));
    else if (kind === 2) parts.push(pick(FIELDS));
    else parts.push(pick(YEARS));
  }
  return parts.join('/');
}

/**
 * @param {number} count
 * @returns {string[]}
 */
function generateOutboundLinks(count) {
  const n = Math.min(20, Math.max(15, Math.floor(count)));
  const links = [];
  for (let i = 0; i < n; i += 1) {
    links.push(`/trap/maze/${randomMazeSegments()}`);
  }
  return links;
}

/**
 * @param {string} html
 * @param {string[]} links
 */
function injectLinks(html, links) {
  const list = links
    .map((href, i) => {
      const tail = href.split('/').filter(Boolean).slice(-2).join(' / ') || 'index';
      return `<li><a href="${escapeAttr(href)}">Related resource ${i + 1}: ${escapeHtml(
        tail,
      )}</a></li>`;
    })
    .join('\n');
  return html.replace(
    '<nav class="hp-links" aria-label="Related resources"><!-- links injected by maze router --></nav>',
    `<nav class="hp-links" aria-label="Related resources"><p><strong>Related pages</strong></p><ul>${list}</ul></nav>`,
  );
}

/**
 * @param {string} s
 */
function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Streams HTML in small chunks over totalMs milliseconds.
 * @param {import('express').Response} res
 * @param {string} html
 * @param {number} totalMs
 * @param {() => void} onDone
 */
function dripWrite(res, html, totalMs, onDone) {
  const chunks = [];
  const size = 512;
  for (let i = 0; i < html.length; i += size) {
    chunks.push(html.slice(i, i + size));
  }
  if (chunks.length === 0) {
    onDone();
    return;
  }
  const gap = Math.max(50, Math.floor(totalMs / chunks.length));
  let idx = 0;
  const step = () => {
    if (idx >= chunks.length) {
      onDone();
      return;
    }
    res.write(chunks[idx]);
    idx += 1;
    setTimeout(step, gap);
  };
  step();
}

// Express 5 path-to-regexp rejects legacy `/*`; a parameter wildcard works for all subpaths.
router.get('/{*mazePath}', (req, res) => {
  mazePagesServed += 1;
  const totalMs = 3000 + Math.floor(Math.random() * 5000); // 3-8s
  totalTimeWastedMs += totalMs;

  const titleParts = [
    pick(DEPARTMENTS).replace(/-/g, ' '),
    pick(FIELDS).replace(/-/g, ' '),
    pick(YEARS),
  ];
  const title = `${titleParts.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(' · ')} — faculty knowledge base`;

  const rawHtml = content.generatePage(title);
  const links = generateOutboundLinks(15 + Math.floor(Math.random() * 6));
  const html = injectLinks(rawHtml, links);

  res.status(200);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  dripWrite(res, html, totalMs, () => {
    res.end();
  });
});

module.exports = router;

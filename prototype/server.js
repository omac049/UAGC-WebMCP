const express = require('express');
const path = require('path');

const apiRouter = require('./routes/api');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

let tarpitApply = null;
try {
  const tarpit = require('./tarpit/middleware.js');
  let fn = typeof tarpit === 'function' ? tarpit : null;
  if (!fn && tarpit && typeof tarpit.middleware === 'function') fn = tarpit.middleware;
  if (!fn && tarpit && typeof tarpit.default === 'function') fn = tarpit.default;
  if (fn) {
    tarpitApply = fn.length === 0 ? fn() : fn;
    if (typeof tarpitApply !== 'function') tarpitApply = fn;
  }
} catch (_) {
  tarpitApply = null;
}

if (tarpitApply) {
  app.use(tarpitApply);
}

try {
  app.use('/trap/maze', require('./tarpit/maze'));
} catch (_) {
  // optional until tarpit/maze.js exists
}

app.use('/', apiRouter);

app.use(express.static(path.join(__dirname, 'public')));

const aeoDir = path.join(__dirname, 'aeo');

app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(aeoDir, 'llms.txt'));
});

app.get('/agents.md', (req, res) => {
  res.type('text/markdown');
  res.sendFile(path.join(aeoDir, 'agents.md'));
});

app.get('/.well-known/webmcp', (req, res) => {
  res.type('application/json');
  res.sendFile(path.join(aeoDir, 'webmcp.json'));
});

const base = `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log(`UAGC WebMCP Prototype running at ${base}`);
  console.log(`Site: ${base}/`);
  console.log(`Agent demo: ${base}/agents.md`);
  console.log(`Manifest: ${base}/.well-known/webmcp`);
  console.log(`llms.txt: ${base}/llms.txt`);
});

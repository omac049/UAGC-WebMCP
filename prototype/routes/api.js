const express = require('express');
const path = require('path');

const programs = require(path.join(__dirname, '..', 'data', 'programs.json'));
const admissions = require(path.join(__dirname, '..', 'data', 'admissions.json'));
const financialAid = require(path.join(__dirname, '..', 'data', 'financial-aid.json'));

const router = express.Router();

function programById(id) {
  return programs.find((p) => String(p.id) === String(id));
}

router.get('/api/programs/search', (req, res) => {
  const { keyword, level, modality } = req.query;

  if (!keyword || typeof keyword !== 'string' || !keyword.trim()) {
    return res.status(400).json({ error: 'keyword is required' });
  }

  const q = keyword.trim().toLowerCase();
  let list = programs.filter((p) => {
    const hay = `${p.name || ''} ${p.description || ''}`.toLowerCase();
    return hay.includes(q);
  });

  if (level) {
    list = list.filter((p) => String(p.level).toLowerCase() === String(level).toLowerCase());
  }
  if (modality) {
    list = list.filter(
      (p) => String(p.modality).toLowerCase() === String(modality).toLowerCase()
    );
  }

  const programsOut = list.map((p) => ({
    id: p.id,
    name: p.name,
    level: p.level,
    modality: p.modality,
    url: p.url
  }));

  res.json({ programs: programsOut });
});

router.get('/api/programs/:id', (req, res) => {
  const program = programById(req.params.id);
  if (!program) {
    return res.status(404).json({ error: 'Program not found' });
  }
  res.json(program);
});

router.get('/api/admissions', (req, res) => {
  const { programLevel, studentType = 'new' } = req.query;

  if (!programLevel || typeof programLevel !== 'string' || !programLevel.trim()) {
    return res.status(400).json({ error: 'programLevel is required' });
  }

  const typeKey = String(studentType);
  const levelKey = String(programLevel).trim();
  const byType = admissions[typeKey];
  const steps = byType && byType[levelKey];

  if (!Array.isArray(steps)) {
    return res.status(404).json({ error: 'Admissions steps not found' });
  }

  res.json({ steps });
});

function randomRefSuffix() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 5; i += 1) {
    s += chars[Math.floor(Math.random() * chars.length)];
  }
  return s;
}

router.post('/api/rfi', (req, res) => {
  const { firstName, lastName, email, phone, programInterest } = req.body || {};

  const missing = [];
  if (!firstName || String(firstName).trim() === '') missing.push('firstName');
  if (!lastName || String(lastName).trim() === '') missing.push('lastName');
  if (!email || String(email).trim() === '') missing.push('email');
  if (!programInterest || String(programInterest).trim() === '') {
    missing.push('programInterest');
  }

  if (missing.length) {
    return res.status(400).json({ error: 'Missing required fields', fields: missing });
  }

  const year = new Date().getFullYear();
  const refNumber = `DU-${year}-${randomRefSuffix()}`;

  console.log('[RFI]', {
    refNumber,
    firstName: String(firstName).trim(),
    lastName: String(lastName).trim(),
    email: String(email).trim(),
    phone: phone != null && String(phone).trim() !== '' ? String(phone).trim() : undefined,
    programInterest: String(programInterest).trim()
  });

  res.json({
    status: 'confirmed',
    refNumber,
    followUp: '24h'
  });
});

router.get('/api/financial-aid/:programId', (req, res) => {
  const { enrollmentStatus = 'full-time' } = req.query;
  const program = programById(req.params.programId);

  if (!program) {
    return res.status(404).json({ error: 'Program not found' });
  }

  const credits = Number(program.credits) || 0;
  const costPerCredit = Number(program.costPerCredit) || 0;
  const tuition = credits * costPerCredit;

  const aidRanges = financialAid.aidRanges || {};
  const range = aidRanges[program.level] || aidRanges[String(program.level).toLowerCase()];

  const multipliers = financialAid.enrollmentMultiplier || {};
  const mult =
    Number(multipliers[enrollmentStatus]) ||
    Number(multipliers[String(enrollmentStatus).toLowerCase()]) ||
    1;

  let minPercent = 0;
  let maxPercent = 0;
  let availableScholarships = [];

  if (range && typeof range === 'object') {
    minPercent = Number(range.minPercent) || 0;
    maxPercent = Number(range.maxPercent) || 0;
    availableScholarships = Array.isArray(range.scholarships) ? range.scholarships : [];
  }

  const minAid = tuition * (minPercent / 100) * mult;
  const maxAid = tuition * (maxPercent / 100) * mult;

  const netMin = Math.max(0, tuition - maxAid);
  const netMax = Math.max(0, tuition - minAid);

  const money = (n) => Math.round(Number(n) * 100) / 100;

  res.json({
    programName: program.name,
    tuition: money(tuition),
    estimatedAid: { min: money(minAid), max: money(maxAid) },
    netCost: { min: money(netMin), max: money(netMax) },
    availableScholarships,
    nextSteps: Array.isArray(financialAid.nextSteps) ? financialAid.nextSteps : []
  });
});

module.exports = router;

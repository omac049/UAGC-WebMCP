(function () {
  const mc = navigator.modelContext;
  if (!mc || typeof mc.registerTool !== 'function') {
    console.error('register-tools: navigator.modelContext is not available');
    return;
  }

  async function readJson(res) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      return { _raw: text };
    }
  }

  mc.registerTool({
    name: 'searchPrograms',
    description: 'Search the academic program catalog by keyword, with optional filters for level and modality.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Search text matched against program name and description.' },
        level: {
          type: 'string',
          enum: ['associate', 'bachelor', 'master', 'doctorate', 'certificate'],
          description: 'Optional program level filter.'
        },
        modality: {
          type: 'string',
          enum: ['online', 'on-campus', 'hybrid'],
          description: 'Optional modality filter.'
        }
      },
      required: ['keyword']
    },
    annotations: { requiresConsent: false, readOnlyHint: true, riskLevel: 'low' },
    async execute(params) {
      const keyword = params && params.keyword != null ? String(params.keyword).trim() : '';
      if (!keyword) {
        throw new Error('keyword is required');
      }
      const q = new URLSearchParams({ keyword });
      if (params && params.level) q.set('level', String(params.level));
      if (params && params.modality) q.set('modality', String(params.modality));
      const res = await fetch(`/api/programs/search?${q.toString()}`);
      const body = await readJson(res);
      if (!res.ok) {
        throw new Error(body.error || `searchPrograms failed (${res.status})`);
      }
      return body;
    }
  });

  mc.registerTool({
    name: 'getProgramDetails',
    description: 'Fetch the full record for a single program by its stable id.',
    inputSchema: {
      type: 'object',
      properties: {
        programId: { type: 'string', description: 'Program id from search results or catalog links.' }
      },
      required: ['programId']
    },
    annotations: { requiresConsent: false, readOnlyHint: true, riskLevel: 'low' },
    async execute(params) {
      const programId = params && params.programId != null ? String(params.programId).trim() : '';
      if (!programId) {
        throw new Error('programId is required');
      }
      const res = await fetch(`/api/programs/${encodeURIComponent(programId)}`);
      const body = await readJson(res);
      if (!res.ok) {
        throw new Error(body.error || `getProgramDetails failed (${res.status})`);
      }
      return body;
    }
  });

  mc.registerTool({
    name: 'getAdmissionsSteps',
    description: 'Return the ordered admissions checklist for a program level and student type.',
    inputSchema: {
      type: 'object',
      properties: {
        programLevel: {
          type: 'string',
          enum: ['associate', 'bachelor', 'master', 'doctorate', 'certificate'],
          description: 'Academic level you are applying into.'
        },
        studentType: {
          type: 'string',
          enum: ['new', 'transfer'],
          description: 'Admissions path; defaults to new if omitted.',
          default: 'new'
        }
      },
      required: ['programLevel']
    },
    annotations: { requiresConsent: false, readOnlyHint: true, riskLevel: 'low' },
    async execute(params) {
      const programLevel =
        params && params.programLevel != null ? String(params.programLevel).trim() : '';
      if (!programLevel) {
        throw new Error('programLevel is required');
      }
      const studentType =
        params && params.studentType != null && String(params.studentType).trim() !== ''
          ? String(params.studentType).trim()
          : 'new';
      const q = new URLSearchParams({ programLevel, studentType });
      const res = await fetch(`/api/admissions?${q.toString()}`);
      const body = await readJson(res);
      if (!res.ok) {
        throw new Error(body.error || `getAdmissionsSteps failed (${res.status})`);
      }
      return body;
    }
  });

  mc.registerTool({
    name: 'submitRFI',
    description:
      'Submit a request-for-information form with contact details and program interest. Requires explicit user consent in the browser.',
    inputSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName: { type: 'string' },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', description: 'Optional phone number.' },
        programInterest: { type: 'string', description: 'Program or topic the prospect is interested in.' }
      },
      required: ['firstName', 'lastName', 'email', 'programInterest']
    },
    annotations: { requiresConsent: true, readOnlyHint: false, riskLevel: 'medium' },
    async execute(params) {
      const res = await fetch('/api/rfi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: params.firstName,
          lastName: params.lastName,
          email: params.email,
          phone: params.phone,
          programInterest: params.programInterest
        })
      });
      const body = await readJson(res);
      if (!res.ok) {
        const msg =
          body.error ||
          (Array.isArray(body.fields) ? `Missing: ${body.fields.join(', ')}` : `submitRFI failed (${res.status})`);
        throw new Error(msg);
      }
      return body;
    }
  });

  mc.registerTool({
    name: 'getFinancialAidEstimate',
    description:
      'Estimate tuition, aid range, net cost, and scholarships for a program given enrollment intensity.',
    inputSchema: {
      type: 'object',
      properties: {
        programId: { type: 'string' },
        enrollmentStatus: {
          type: 'string',
          enum: ['full-time', 'half-time', 'less-than-half'],
          description: 'Enrollment intensity used to scale aid estimates.'
        }
      },
      required: ['programId', 'enrollmentStatus']
    },
    annotations: { requiresConsent: false, readOnlyHint: true, riskLevel: 'medium' },
    async execute(params) {
      const programId = params && params.programId != null ? String(params.programId).trim() : '';
      if (!programId) {
        throw new Error('programId is required');
      }
      const enrollmentStatus =
        params && params.enrollmentStatus != null ? String(params.enrollmentStatus).trim() : '';
      if (!enrollmentStatus) {
        throw new Error('enrollmentStatus is required');
      }
      const q = new URLSearchParams({ enrollmentStatus });
      const res = await fetch(
        `/api/financial-aid/${encodeURIComponent(programId)}?${q.toString()}`
      );
      const body = await readJson(res);
      if (!res.ok) {
        throw new Error(body.error || `getFinancialAidEstimate failed (${res.status})`);
      }
      return body;
    }
  });
})();

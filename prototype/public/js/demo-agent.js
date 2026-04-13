(function () {
  const mc = navigator.modelContext;
  if (!mc || typeof mc.invokeTool !== 'function') {
    console.error('demo-agent: navigator.modelContext.invokeTool is not available');
    return;
  }

  const chatLog = document.getElementById('chat-log');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const inspectorLog = document.getElementById('inspector-log');
  const typingRow = document.getElementById('typing-row');

  if (!chatLog || !chatForm || !chatInput || !inspectorLog) {
    console.error('demo-agent: missing required DOM nodes');
    return;
  }

  const context = {
    lastProgramId: null,
    lastProgramName: null,
    lastSearchKeyword: null,
    rfi: null
  };

  const origInvoke = mc.invokeTool.bind(mc);
  mc.invokeTool = async function instrumentedInvokeTool(name, params) {
    const started = performance.now();
    const ts = new Date();
    try {
      const result = await origInvoke(name, params);
      const durationMs = Math.round(performance.now() - started);
      appendInspectorCard({
        ok: true,
        name,
        params,
        response: result,
        durationMs,
        ts
      });
      return result;
    } catch (err) {
      const durationMs = Math.round(performance.now() - started);
      appendInspectorCard({
        ok: false,
        name,
        params,
        response: { error: err && err.message ? err.message : String(err) },
        durationMs,
        ts
      });
      throw err;
    }
  };

  function scrollChatToBottom() {
    const wrap = chatLog.closest('.chat-scroll');
    if (wrap) {
      wrap.scrollTop = wrap.scrollHeight;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function appendMessage(role, html) {
    const row = document.createElement('div');
    row.className = `chat-row chat-row--${role}`;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble chat-bubble--${role}`;
    bubble.innerHTML = html;
    row.appendChild(bubble);
    chatLog.appendChild(row);
    scrollChatToBottom();
  }

  function setTyping(on) {
    typingRow.hidden = !on;
    scrollChatToBottom();
  }

  function appendInspectorCard({ ok, name, params, response, durationMs, ts }) {
    const card = document.createElement('article');
    card.className = `inspector-card inspector-card--${ok ? 'ok' : 'err'}`;
    const timeStr = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    card.innerHTML = `
      <header class="inspector-card__head">
        <span class="inspector-card__name">${escapeHtml(name)}</span>
        <span class="inspector-card__meta">${escapeHtml(timeStr)} · ${durationMs} ms</span>
      </header>
      <div class="inspector-card__block">
        <div class="inspector-card__label">Parameters</div>
        <pre class="inspector-card__pre">${escapeHtml(JSON.stringify(params ?? {}, null, 2))}</pre>
      </div>
      <div class="inspector-card__block">
        <div class="inspector-card__label">Response</div>
        <pre class="inspector-card__pre">${escapeHtml(JSON.stringify(response ?? {}, null, 2))}</pre>
      </div>
    `;
    inspectorLog.prepend(card);
  }

  const PROGRAM_ID_RE = /\b([a-z]{2,5}-[a-z0-9-]{3,})\b/i;

  function extractProgramId(text) {
    const m = text.match(PROGRAM_ID_RE);
    return m ? m[1].toLowerCase() : null;
  }

  function extractKeywordFromSearch(text) {
    const t = text.toLowerCase();
    const about = t.match(
      /\b(?:about|for|in|related to)\s+([a-z0-9][a-z0-9\s]{1,40})/i
    );
    if (about) return about[1].trim();
    const find = t.match(/find\s+(?:programs?\s+)?(?:about|for)?\s*([a-z0-9][a-z0-9\s]{1,40})/i);
    if (find) return find[1].trim();
    const prog = t.match(/programs?\s+(?:about|for|in)\s+([a-z0-9][a-z0-9\s]{1,40})/i);
    if (prog) return prog[1].trim();
    return null;
  }

  function inferProgramLevel(text) {
    const t = text.toLowerCase();
    if (/\b(master|graduate|grad|m\.?ed|mba|ms|ma)\b/.test(t)) return 'master';
    if (/\b(bachelor|undergrad|bs|ba|b\.?s)\b/.test(t)) return 'bachelor';
    if (/\b(associate|aa|as)\b/.test(t)) return 'associate';
    if (/\b(doctor|phd|edd|doctoral)\b/.test(t)) return 'doctorate';
    if (/\b(certificate|cert)\b/.test(t)) return 'certificate';
    return null;
  }

  function detectIntent(raw) {
    const text = raw.trim();
    const lower = text.toLowerCase();

    if (!text) return { type: 'empty' };

    if (
      /^\s*help\s*$/i.test(text) ||
      /\b(what tools|list tools|available tools|help me|\/help)\b/.test(lower)
    ) {
      return { type: 'help_tools' };
    }

    if (context.rfi && context.rfi.active) {
      return { type: 'rfi_answer', text };
    }

    if (
      /\b(request info|rfi|sign me up|sign up|contact me|lead form|more information|get in touch)\b/.test(lower)
    ) {
      return { type: 'rfi_start' };
    }

    if (/\b(financial aid|faFSA|scholarship|tuition|how much|cost|net cost|aid estimate)\b/.test(lower)) {
      return { type: 'financial_aid', text };
    }

    if (/\b(how do i apply|admissions steps|application steps|apply|enroll)\b/.test(lower)) {
      return { type: 'admissions', text };
    }

    if (/\b(find|search|browse)\b.*\bprogram/.test(lower) || /\bprograms?\s+(about|for|in)\b/.test(lower)) {
      const keyword = extractKeywordFromSearch(text) || text.replace(/^.*?\b(programs?|find|search)\b/gi, '').trim();
      return { type: 'search', keyword: keyword || 'education' };
    }

    if (
      /\b(tell me about|details on|more about|describe|overview of|what is)\b/.test(lower) ||
      extractProgramId(text)
    ) {
      return { type: 'program_detail', text };
    }

    if (/\bprogram/.test(lower) && text.length < 80) {
      return { type: 'search', keyword: extractKeywordFromSearch(text) || 'program' };
    }

    return { type: 'fallback', text };
  }

  function formatProgramList(data) {
    const programs = Array.isArray(data.programs) ? data.programs : [];
    if (!programs.length) {
      return '<p>No programs matched that search. Try another keyword like <strong>education</strong> or <strong>business</strong>.</p>';
    }
    const items = programs
      .map(
        (p) =>
          `<li><strong>${escapeHtml(p.name)}</strong> <span class="muted">(${escapeHtml(
            p.level
          )}, ${escapeHtml(p.modality)})</span><br/><span class="muted">id:</span> <code>${escapeHtml(
            p.id
          )}</code></li>`
      )
      .join('');
    return `<p>Here is what I found:</p><ul class="agent-list">${items}</ul>`;
  }

  function formatProgramDetail(p) {
    const outcomes = Array.isArray(p.outcomes)
      ? `<p><strong>Outcomes</strong></p><ul class="agent-list">${p.outcomes
          .map((o) => `<li>${escapeHtml(o)}</li>`)
          .join('')}</ul>`
      : '';
    const reqs = Array.isArray(p.requirements)
      ? `<p><strong>Requirements</strong></p><ul class="agent-list">${p.requirements
          .map((r) => `<li>${escapeHtml(r)}</li>`)
          .join('')}</ul>`
      : '';
    return `
      <p><strong>${escapeHtml(p.name)}</strong> <span class="muted">(${escapeHtml(p.level)}, ${escapeHtml(
      p.modality
    )})</span></p>
      <p>${escapeHtml(p.description || '')}</p>
      ${outcomes}
      ${reqs}
      <p class="muted">Credits: ${escapeHtml(String(p.credits))} · Cost/credit: $${escapeHtml(
      String(p.costPerCredit)
    )}</p>
    `;
  }

  function formatAdmissions(steps) {
    if (!Array.isArray(steps) || !steps.length) {
      return '<p>No admissions steps were returned for that combination.</p>';
    }
    const items = steps
      .map(
        (s) =>
          `<li><strong>${escapeHtml(s.title)}</strong> — ${escapeHtml(
            s.description || ''
          )}</li>`
      )
      .join('');
    return `<p>Here is a clear path to apply:</p><ol class="agent-steps">${items}</ol>`;
  }

  function formatFinancialAid(data) {
    const aid = data.estimatedAid || {};
    const net = data.netCost || {};
    const scholarships = Array.isArray(data.availableScholarships) ? data.availableScholarships : [];
    const scholList = scholarships.length
      ? `<ul class="agent-list">${scholarships.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
      : '<p class="muted">No named scholarships in this band.</p>';
    const next = Array.isArray(data.nextSteps)
      ? `<p><strong>Next steps</strong></p><ol class="agent-steps">${data.nextSteps
          .map((s) => `<li>${escapeHtml(s)}</li>`)
          .join('')}</ol>`
      : '';
    return `
      <p><strong>${escapeHtml(data.programName || 'Program')}</strong></p>
      <p>Estimated tuition: <strong>$${escapeHtml(String(data.tuition))}</strong></p>
      <p>Estimated aid range: <strong>$${escapeHtml(String(aid.min))}</strong> – <strong>$${escapeHtml(
      String(aid.max)
    )}</strong></p>
      <p>Estimated net cost: <strong>$${escapeHtml(String(net.min))}</strong> – <strong>$${escapeHtml(
      String(net.max)
    )}</strong></p>
      <p><strong>Scholarships to explore</strong></p>
      ${scholList}
      ${next}
    `;
  }

  function formatToolsList() {
    const tools = mc.getTools();
    if (!tools.length) {
      return '<p>No tools are registered on this page.</p>';
    }
    const items = tools
      .map(
        (t) =>
          `<li><strong>${escapeHtml(t.name)}</strong> — ${escapeHtml(t.description || '')} <span class="muted">(risk: ${escapeHtml(
            (t.annotations && t.annotations.riskLevel) || 'n/a'
          )})</span></li>`
      )
      .join('');
    return `<p>I can call these WebMCP tools (with your consent when needed):</p><ul class="agent-list">${items}</ul>`;
  }

  function startRfiFlow() {
    context.rfi = {
      active: true,
      step: 'firstName',
      data: { firstName: '', lastName: '', email: '', phone: '', programInterest: '' }
    };
    return '<p>Great — I can submit a request for information. Share your <strong>first name</strong> to begin.</p>';
  }

  function rfiPromptForStep(step) {
    const prompts = {
      lastName: '<p>Thanks. What is your <strong>last name</strong>?</p>',
      email: '<p>What <strong>email address</strong> should we use?</p>',
      phone:
        '<p>Optionally share a <strong>phone number</strong> (or type <strong>skip</strong> to leave it blank).</p>',
      programInterest:
        '<p>Which <strong>program or topic</strong> are you most interested in? You can paste a program name or id.</p>'
    };
    return prompts[step] || '<p>Tell me a bit more so I can continue.</p>';
  }

  async function handleRfiAnswer(text) {
    const rfi = context.rfi;
    if (!rfi || !rfi.active) return '';

    const val = text.trim();
    const { data } = rfi;

    if (rfi.step === 'firstName') {
      data.firstName = val;
      rfi.step = 'lastName';
      return rfiPromptForStep('lastName');
    }
    if (rfi.step === 'lastName') {
      data.lastName = val;
      rfi.step = 'email';
      return rfiPromptForStep('email');
    }
    if (rfi.step === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        return '<p>That email does not look valid yet. Could you double-check it?</p>';
      }
      data.email = val;
      rfi.step = 'phone';
      return rfiPromptForStep('phone');
    }
    if (rfi.step === 'phone') {
      data.phone = val.toLowerCase() === 'skip' ? '' : val;
      rfi.step = 'programInterest';
      return rfiPromptForStep('programInterest');
    }
    if (rfi.step === 'programInterest') {
      data.programInterest = val;
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        programInterest: data.programInterest
      };
      const res = await mc.invokeTool('submitRFI', payload);
      context.rfi = null;
      return `<p>Your request is in. Reference <strong>${escapeHtml(
        res.refNumber
      )}</strong> — status <strong>${escapeHtml(res.status)}</strong>. Typical follow-up: <strong>${escapeHtml(
        res.followUp
      )}</strong>.</p>`;
    }
    return '';
  }

  async function handleUserMessage(raw) {
    const intent = detectIntent(raw);

    if (intent.type === 'empty') {
      return '<p>Try asking me to find programs, explain costs, outline admissions, or request information.</p>';
    }

    if (intent.type === 'help_tools') {
      return formatToolsList();
    }

    if (intent.type === 'rfi_start') {
      return startRfiFlow();
    }

    if (intent.type === 'rfi_answer') {
      return handleRfiAnswer(intent.text);
    }

    if (intent.type === 'search') {
      const keyword = intent.keyword || 'education';
      context.lastSearchKeyword = keyword;
      const data = await mc.invokeTool('searchPrograms', { keyword });
      if (Array.isArray(data.programs) && data.programs[0]) {
        context.lastProgramId = data.programs[0].id;
        context.lastProgramName = data.programs[0].name;
      }
      return formatProgramList(data);
    }

    if (intent.type === 'program_detail') {
      let programId = extractProgramId(intent.text);
      if (!programId && context.lastProgramId) {
        programId = context.lastProgramId;
      }
      if (!programId) {
        return '<p>I need a program id (for example <code>med-curriculum</code>) or search for a program first.</p>';
      }
      const p = await mc.invokeTool('getProgramDetails', { programId });
      context.lastProgramId = p.id || programId;
      context.lastProgramName = p.name || context.lastProgramName;
      return formatProgramDetail(p);
    }

    if (intent.type === 'admissions') {
      const level =
        inferProgramLevel(intent.text) ||
        inferProgramLevel(context.lastProgramName || '') ||
        (context.lastProgramId && context.lastProgramId.includes('bs-')
          ? 'bachelor'
          : context.lastProgramId && context.lastProgramId.includes('med-')
            ? 'master'
            : null) ||
        'bachelor';
      const studentType = /\btransfer\b/i.test(intent.text) ? 'transfer' : 'new';
      const data = await mc.invokeTool('getAdmissionsSteps', { programLevel: level, studentType });
      return formatAdmissions(data.steps);
    }

    if (intent.type === 'financial_aid') {
      let programId = extractProgramId(intent.text) || context.lastProgramId;
      if (!programId) {
        return '<p>Tell me which program to price (paste an id like <code>bs-business</code>) or search for a program first.</p>';
      }
      let enrollmentStatus = 'full-time';
      if (/\bhalf[-\s]?time\b/i.test(intent.text)) enrollmentStatus = 'half-time';
      if (/\bless than half\b/i.test(intent.text)) enrollmentStatus = 'less-than-half';
      const data = await mc.invokeTool('getFinancialAidEstimate', { programId, enrollmentStatus });
      return formatFinancialAid(data);
    }

    return `<p>I am a lightweight demo agent (keyword rules, not an LLM). Try:</p>
      <ul class="agent-list">
        <li><strong>Find programs about education</strong></li>
        <li><strong>Tell me about med-curriculum</strong></li>
        <li><strong>How do I apply</strong> (I will use your last program level when possible)</li>
        <li><strong>Financial aid estimate</strong> after you pick a program</li>
        <li><strong>I want to request info</strong> for a guided form</li>
      </ul>`;
  }

  async function onSubmit(ev) {
    ev.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    appendMessage('user', `<p>${escapeHtml(text)}</p>`);
    setTyping(true);
    try {
      const replyHtml = await handleUserMessage(text);
      appendMessage('agent', replyHtml);
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      appendMessage('agent', `<p>Something went wrong: ${escapeHtml(msg)}</p>`);
    } finally {
      setTyping(false);
    }
  }

  chatForm.addEventListener('submit', onSubmit);

  chatInput.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      chatForm.requestSubmit();
    }
  });

  appendMessage(
    'agent',
    `<p><strong>Welcome.</strong> I am a tiny in-browser agent that calls this site’s WebMCP tools through <code>navigator.modelContext</code>.</p>
     <p>Try asking me to <strong>find programs</strong>, share <strong>admissions steps</strong>, estimate <strong>financial aid</strong>, or <strong>request information</strong> (that last one will show a consent screen before anything is sent).</p>
     <p class="muted">Watch the inspector on the right to see each tool call, parameters, JSON responses, and timing.</p>`
  );
})();

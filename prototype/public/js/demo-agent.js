(function () {
  var mc = navigator.modelContext;
  if (!mc || typeof mc.invokeTool !== 'function') {
    console.error('demo-agent: navigator.modelContext.invokeTool is not available');
    return;
  }

  var chatLog = document.getElementById('chat-log');
  var chatForm = document.getElementById('chat-form');
  var chatInput = document.getElementById('chat-input');
  var inspectorLog = document.getElementById('inspector-log');
  var typingRow = document.getElementById('typing-row');

  if (!chatLog || !chatForm || !chatInput || !inspectorLog) {
    console.error('demo-agent: missing required DOM nodes');
    return;
  }

  /* ---- Conversation memory ---- */

  var ctx = {
    lastProgramId: null,
    lastProgramName: null,
    lastProgramLevel: null,
    lastSearchKeyword: null,
    lastSearchResults: [],
    rfi: null,
    turnCount: 0
  };

  /* ---- Instrument invokeTool for the inspector ---- */

  var origInvoke = mc.invokeTool.bind(mc);
  mc.invokeTool = function instrumentedInvokeTool(name, params) {
    var started = performance.now();
    var ts = new Date();
    return origInvoke(name, params).then(function (result) {
      appendInspectorCard({ ok: true, name: name, params: params, response: result, durationMs: Math.round(performance.now() - started), ts: ts });
      return result;
    }).catch(function (err) {
      appendInspectorCard({ ok: false, name: name, params: params, response: { error: err && err.message ? err.message : String(err) }, durationMs: Math.round(performance.now() - started), ts: ts });
      throw err;
    });
  };

  /* ---- DOM helpers ---- */

  function scrollChatToBottom() {
    var wrap = chatLog.closest('.chat-scroll');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  }

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function appendMessage(role, html) {
    var row = document.createElement('div');
    row.className = 'chat-row chat-row--' + role;
    var bubble = document.createElement('div');
    bubble.className = 'chat-bubble chat-bubble--' + role;
    bubble.innerHTML = html;
    row.appendChild(bubble);
    chatLog.appendChild(row);
    scrollChatToBottom();
  }

  function setTyping(on) {
    typingRow.hidden = !on;
    scrollChatToBottom();
  }

  function appendInspectorCard(o) {
    var card = document.createElement('article');
    card.className = 'inspector-card inspector-card--' + (o.ok ? 'ok' : 'err');
    var timeStr = o.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    card.innerHTML =
      '<header class="inspector-card__head"><span class="inspector-card__name">' + esc(o.name) + '</span><span class="inspector-card__meta">' + esc(timeStr) + ' · ' + o.durationMs + ' ms</span></header>' +
      '<div class="inspector-card__block"><div class="inspector-card__label">Parameters</div><pre class="inspector-card__pre">' + esc(JSON.stringify(o.params || {}, null, 2)) + '</pre></div>' +
      '<div class="inspector-card__block"><div class="inspector-card__label">Response</div><pre class="inspector-card__pre">' + esc(JSON.stringify(o.response || {}, null, 2)) + '</pre></div>';
    inspectorLog.prepend(card);
  }

  /* ---- NLP-lite extraction ---- */

  function lower(s) { return (s || '').toLowerCase(); }

  function inferLevel(text) {
    var t = lower(text);
    if (/\b(master'?s?|graduate|grad|m\.?ed|mba|m\.?s\.?|m\.?a\.?)\b/.test(t)) return 'master';
    if (/\b(bachelor'?s?|undergrad|b\.?s\.?|b\.?a\.?)\b/.test(t)) return 'bachelor';
    if (/\b(associate'?s?|a\.?a\.?|a\.?s\.?)\b/.test(t)) return 'associate';
    if (/\b(doctor|phd|edd|doctoral|doctorate)\b/.test(t)) return 'doctorate';
    if (/\b(certificate|cert)\b/.test(t)) return 'certificate';
    return null;
  }

  function inferModality(text) {
    var t = lower(text);
    if (/\bonline\b/.test(t)) return 'online';
    if (/\bhybrid\b/.test(t)) return 'hybrid';
    if (/\b(on[- ]?campus|in[- ]?person)\b/.test(t)) return 'on-campus';
    return null;
  }

  var STOP_WORDS = /\b(find|me|an?|the|some|any|about|for|in|on|to|my|your|their|i|we|you|do|does|can|could|would|should|want|need|looking|search|show|get|give|tell|what|which|where|how|please|program|programs|degree|degrees|course|courses|class|classes|affordable|cheap|best|top|good|great)\b/gi;

  function extractTopic(text) {
    var t = lower(text);
    t = t.replace(/\b(master'?s?|bachelor'?s?|associate'?s?|doctorate?|doctoral|certificate|cert|graduate|undergrad|online|hybrid|on[- ]?campus|in[- ]?person)\b/g, '');
    t = t.replace(STOP_WORDS, '');
    t = t.replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
    return t || null;
  }

  var PROGRAM_ID_RE = /\b([a-z]{2,5}-[a-z0-9-]{2,})\b/i;

  function extractProgramId(text) {
    var m = text.match(PROGRAM_ID_RE);
    return m ? m[1].toLowerCase() : null;
  }

  function resolveLevel(text) {
    return inferLevel(text) || ctx.lastProgramLevel || null;
  }

  /* ---- Intent classification ---- */

  function detectIntent(raw) {
    var text = raw.trim();
    var t = lower(text);
    if (!text) return { type: 'empty' };

    if (/^\s*help\s*$/i.test(text) || /\b(what tools|list tools|available tools|help me|\/help)\b/.test(t)) {
      return { type: 'help_tools' };
    }

    if (ctx.rfi && ctx.rfi.active) {
      return { type: 'rfi_answer', text: text };
    }

    if (/\b(request info|rfi|sign me up|sign up|contact me|lead form|more information|get in touch|reach out|send.{0,10}info)\b/.test(t)) {
      return { type: 'rfi_start' };
    }

    if (/\b(financial aid|fafsa|scholarship|tuition|how much|cost|net cost|aid estimate|afford|price|pricing|pay)\b/.test(t)) {
      return { type: 'financial_aid', text: text };
    }

    if (/\b(how.{0,8}appl|admission|enroll|apply|application|getting.{0,5}start|next.{0,5}step|sign.{0,3}up.{0,5}class)\b/.test(t)) {
      return { type: 'admissions', text: text };
    }

    if (extractProgramId(text)) {
      return { type: 'program_detail', text: text };
    }

    if (/\b(tell me (more )?about|details? (on|about|for)|more about|describe|overview|what is|info (on|about))\b/.test(t)) {
      var hasTopic = extractTopic(text);
      if (hasTopic && hasTopic.length > 2) {
        return { type: 'program_detail', text: text };
      }
      if (ctx.lastProgramId) {
        return { type: 'program_detail', text: text };
      }
      return { type: 'search', text: text };
    }

    var topic = extractTopic(text);
    var level = inferLevel(text);
    var hasSearchSignal = /\b(find|search|browse|look|show|explore|list|what|which|any|recommend)\b/.test(t);
    var hasProgramWord = /\b(program|degree|course|major|class|master|bachelor|associate|certificate|education|business|it|health|data|leadership|teaching)\b/.test(t);

    if (hasSearchSignal || hasProgramWord || level) {
      return { type: 'search', text: text, topic: topic, level: level, modality: inferModality(text) };
    }

    if (/\b(thank|thanks|ok|okay|cool|great|got it)\b/.test(t)) {
      return { type: 'acknowledge' };
    }

    if (/\b(hi|hello|hey|greetings|good morning|good afternoon)\b/.test(t)) {
      return { type: 'greeting' };
    }

    if (topic && topic.length >= 3) {
      return { type: 'search', text: text, topic: topic };
    }

    return { type: 'fallback', text: text };
  }

  /* ---- Response formatters ---- */

  function fmtMoney(n) {
    var x = Number(n);
    if (!isFinite(x)) return '—';
    return '$' + x.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function fmtProgramList(data, query) {
    var programs = Array.isArray(data.programs) ? data.programs : [];
    if (!programs.length) {
      return '<p>I didn\'t find programs matching that. Try a broader term like <strong>education</strong>, <strong>business</strong>, or <strong>technology</strong>.</p>';
    }
    var intro = query
      ? '<p>Here\'s what I found for <strong>' + esc(query) + '</strong>:</p>'
      : '<p>Here\'s what I found:</p>';
    var items = programs.map(function (p) {
      return '<li><strong>' + esc(p.name) + '</strong> <span class="muted">(' + esc(p.level) + ', ' + esc(p.modality) + ')</span><br/>' +
        '<span class="muted">Say</span> <code>' + esc(p.id) + '</code> <span class="muted">for details</span></li>';
    }).join('');
    var tip = programs.length === 1
      ? '<p class="muted">Want details? Just say <strong>tell me about ' + esc(programs[0].id) + '</strong> or <strong>tell me more</strong>.</p>'
      : '<p class="muted">Say a program ID like <strong>' + esc(programs[0].id) + '</strong> to see details, admissions requirements, and estimated cost.</p>';
    return intro + '<ul class="agent-list">' + items + '</ul>' + tip;
  }

  function fmtProgramDetail(p) {
    var total = (Number(p.credits) || 0) * (Number(p.costPerCredit) || 0);
    var outcomes = Array.isArray(p.outcomes)
      ? '<p><strong>What you\'ll learn</strong></p><ul class="agent-list">' + p.outcomes.map(function (o) { return '<li>' + esc(o) + '</li>'; }).join('') + '</ul>'
      : '';
    var reqs = Array.isArray(p.requirements)
      ? '<p><strong>To get in, you\'ll need</strong></p><ul class="agent-list">' + p.requirements.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ul>'
      : '';
    return '<p><strong>' + esc(p.name) + '</strong> <span class="muted">(' + esc(p.level) + ', ' + esc(p.modality) + ')</span></p>' +
      '<p>' + esc(p.description || '') + '</p>' +
      '<p><strong>Estimated cost:</strong> ' + fmtMoney(total) + ' <span class="muted">(' + p.credits + ' credits × ' + fmtMoney(p.costPerCredit) + '/credit)</span></p>' +
      outcomes + reqs +
      '<p class="muted">You can ask me for <strong>financial aid estimate</strong>, <strong>how to apply</strong>, or <strong>request info</strong> for this program.</p>';
  }

  function fmtAdmissions(steps, level) {
    if (!Array.isArray(steps) || !steps.length) {
      return '<p>I couldn\'t find admissions steps for that combination. Try specifying a level like <strong>master\'s</strong> or <strong>bachelor\'s</strong>.</p>';
    }
    var intro = level
      ? '<p>Here\'s the enrollment path for <strong>' + esc(level) + '</strong>-level programs:</p>'
      : '<p>Here\'s how to apply:</p>';
    var items = steps.map(function (s) {
      return '<li><strong>' + esc(s.title) + '</strong> — ' + esc(s.description || '') + '</li>';
    }).join('');
    return intro + '<ol class="agent-steps">' + items + '</ol>' +
      '<p class="muted">Ready to take the first step? Say <strong>request info</strong> and I\'ll walk you through it.</p>';
  }

  function fmtFinancialAid(data) {
    var aid = data.estimatedAid || {};
    var net = data.netCost || {};
    var scholarships = Array.isArray(data.availableScholarships) ? data.availableScholarships : [];
    var scholList = scholarships.length
      ? '<ul class="agent-list">' + scholarships.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>'
      : '';
    var next = Array.isArray(data.nextSteps)
      ? '<p><strong>Your next steps</strong></p><ol class="agent-steps">' + data.nextSteps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>'
      : '';
    return '<p><strong>' + esc(data.programName || 'Program') + '</strong></p>' +
      '<p>Estimated tuition: <strong>' + fmtMoney(data.tuition) + '</strong></p>' +
      '<p>Estimated aid: <strong>' + fmtMoney(aid.min) + '</strong> – <strong>' + fmtMoney(aid.max) + '</strong></p>' +
      '<p>Your estimated net cost: <strong>' + fmtMoney(net.min) + '</strong> – <strong>' + fmtMoney(net.max) + '</strong></p>' +
      (scholarships.length ? '<p><strong>Scholarships to explore</strong></p>' + scholList : '') +
      next;
  }

  function fmtToolsList() {
    var tools = mc.getTools();
    if (!tools.length) return '<p>No tools registered on this page.</p>';
    var items = tools.map(function (t) {
      return '<li><strong>' + esc(t.name) + '</strong> — ' + esc(t.description || '') + '</li>';
    }).join('');
    return '<p>I can call these WebMCP tools:</p><ul class="agent-list">' + items + '</ul>';
  }

  /* ---- RFI guided flow ---- */

  function startRfiFlow() {
    ctx.rfi = {
      active: true,
      step: 'firstName',
      data: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        programInterest: ctx.lastProgramId || ''
      }
    };
    var prefill = ctx.lastProgramName
      ? '<p class="muted">I\'ll pre-fill your program interest as <strong>' + esc(ctx.lastProgramName) + '</strong> — you can change it later.</p>'
      : '';
    return '<p>I\'ll walk you through a quick request-for-information form. What\'s your <strong>first name</strong>?</p>' + prefill;
  }

  var RFI_PROMPTS = {
    lastName: '<p>And your <strong>last name</strong>?</p>',
    email: '<p>What\'s the best <strong>email</strong> to reach you?</p>',
    phone: '<p>A <strong>phone number</strong>? (say <strong>skip</strong> if you\'d rather not)</p>',
    programInterest: null
  };

  function rfiPromptForProgram() {
    if (ctx.rfi.data.programInterest) {
      return '<p>I have <strong>' + esc(ctx.lastProgramName || ctx.rfi.data.programInterest) + '</strong> as your program interest. Say <strong>yes</strong> to confirm or type a different program name.</p>';
    }
    return '<p>Which <strong>program</strong> are you most interested in? You can paste a name or ID.</p>';
  }

  function handleRfiAnswer(text) {
    var rfi = ctx.rfi;
    if (!rfi || !rfi.active) return Promise.resolve('');
    var val = text.trim();
    var d = rfi.data;

    if (rfi.step === 'firstName') {
      d.firstName = val;
      rfi.step = 'lastName';
      return Promise.resolve(RFI_PROMPTS.lastName);
    }
    if (rfi.step === 'lastName') {
      d.lastName = val;
      rfi.step = 'email';
      return Promise.resolve(RFI_PROMPTS.email);
    }
    if (rfi.step === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)) {
        return Promise.resolve('<p>That doesn\'t look like a valid email. Mind double-checking?</p>');
      }
      d.email = val;
      rfi.step = 'phone';
      return Promise.resolve(RFI_PROMPTS.phone);
    }
    if (rfi.step === 'phone') {
      d.phone = lower(val) === 'skip' ? '' : val;
      rfi.step = 'programInterest';
      return Promise.resolve(rfiPromptForProgram());
    }
    if (rfi.step === 'programInterest') {
      if (/^(yes|yep|yeah|y|confirm|correct|that'?s? (right|correct|it))$/i.test(val) && d.programInterest) {
        // keep existing
      } else {
        d.programInterest = val;
      }
      var payload = {
        firstName: d.firstName,
        lastName: d.lastName,
        email: d.email,
        phone: d.phone || undefined,
        programInterest: d.programInterest
      };
      return mc.invokeTool('submitRFI', payload).then(function (res) {
        ctx.rfi = null;
        return '<p>All set! Your reference number is <strong>' + esc(res.refNumber) + '</strong>.</p>' +
          '<p>Status: <strong>' + esc(res.status) + '</strong>. An advisor will follow up within <strong>' + esc(res.followUp) + '</strong>.</p>';
      });
    }
    return Promise.resolve('');
  }

  /* ---- Main handler ---- */

  function handleUserMessage(raw) {
    ctx.turnCount++;
    var intent = detectIntent(raw);

    if (intent.type === 'empty') {
      return Promise.resolve('<p>Go ahead — ask me about programs, costs, admissions, or say <strong>request info</strong> to get started.</p>');
    }

    if (intent.type === 'greeting') {
      return Promise.resolve('<p>Hi there! I can help you explore programs, check admissions steps, estimate financial aid, or submit a request for information. What are you looking for?</p>');
    }

    if (intent.type === 'acknowledge') {
      var hints = [];
      if (!ctx.lastProgramId) hints.push('search for a program');
      if (ctx.lastProgramId && !ctx.lastProgramLevel) hints.push('ask how to apply');
      if (ctx.lastProgramId) hints.push('get a financial aid estimate');
      hints.push('request information');
      return Promise.resolve('<p>Glad to help! Want to ' + hints.join(', ') + '?</p>');
    }

    if (intent.type === 'help_tools') {
      return Promise.resolve(fmtToolsList());
    }

    if (intent.type === 'rfi_start') {
      return Promise.resolve(startRfiFlow());
    }

    if (intent.type === 'rfi_answer') {
      return handleRfiAnswer(intent.text);
    }

    if (intent.type === 'search') {
      var keyword = intent.topic || extractTopic(intent.text || raw) || ctx.lastSearchKeyword || 'education';
      var level = intent.level || inferLevel(raw);
      var modality = intent.modality || inferModality(raw);
      ctx.lastSearchKeyword = keyword;
      if (level) ctx.lastProgramLevel = level;

      return mc.invokeTool('searchPrograms', { keyword: keyword }).then(function (data) {
        var programs = Array.isArray(data.programs) ? data.programs : [];

        if (level || modality) {
          programs = programs.filter(function (p) {
            if (level && p.level !== level) return false;
            if (modality && p.modality !== modality) return false;
            return true;
          });
        }

        if (programs.length > 0) {
          ctx.lastProgramId = programs[0].id;
          ctx.lastProgramName = programs[0].name;
          ctx.lastProgramLevel = programs[0].level;
          ctx.lastSearchResults = programs;
        }

        var filtered = { programs: programs };
        var qualifier = [level, modality, keyword].filter(Boolean).join(' ');
        return fmtProgramList(filtered, qualifier);
      });
    }

    if (intent.type === 'program_detail') {
      var programId = extractProgramId(intent.text);

      if (!programId) {
        var topic = extractTopic(intent.text);
        if (topic && ctx.lastSearchResults.length) {
          var match = ctx.lastSearchResults.find(function (p) {
            return lower(p.name).indexOf(lower(topic)) !== -1 || lower(p.id).indexOf(lower(topic)) !== -1;
          });
          if (match) programId = match.id;
        }
      }

      if (!programId && ctx.lastProgramId) {
        programId = ctx.lastProgramId;
      }

      if (!programId) {
        return Promise.resolve('<p>Which program would you like details on? Try searching first — say <strong>find programs about education</strong>.</p>');
      }

      return mc.invokeTool('getProgramDetails', { programId: programId }).then(function (p) {
        ctx.lastProgramId = p.id || programId;
        ctx.lastProgramName = p.name || ctx.lastProgramName;
        ctx.lastProgramLevel = p.level || ctx.lastProgramLevel;
        return fmtProgramDetail(p);
      });
    }

    if (intent.type === 'admissions') {
      var level = inferLevel(intent.text) || ctx.lastProgramLevel || 'bachelor';
      var studentType = /\btransfer\b/i.test(intent.text) ? 'transfer' : /\breturn/i.test(intent.text) ? 'returning' : 'new';
      ctx.lastProgramLevel = level;

      return mc.invokeTool('getAdmissionsSteps', { programLevel: level, studentType: studentType }).then(function (data) {
        return fmtAdmissions(data.steps, level);
      });
    }

    if (intent.type === 'financial_aid') {
      var programId = extractProgramId(intent.text) || ctx.lastProgramId;
      if (!programId) {
        return Promise.resolve('<p>I need a program first to estimate aid. Try <strong>find programs about education</strong> then ask about costs.</p>');
      }
      var enrollmentStatus = 'full-time';
      if (/\bhalf[-\s]?time\b/i.test(intent.text)) enrollmentStatus = 'half-time';
      if (/\bless than half\b/i.test(intent.text)) enrollmentStatus = 'less-than-half';

      return mc.invokeTool('getFinancialAidEstimate', { programId: programId, enrollmentStatus: enrollmentStatus }).then(function (data) {
        return fmtFinancialAid(data);
      });
    }

    // Conversational fallback
    return Promise.resolve(
      '<p>I\'m not sure I understood that, but I can help with a few things:</p>' +
      '<ul class="agent-list">' +
      '<li><strong>Find me a master\'s in education</strong> — search programs by topic, level, or modality</li>' +
      '<li><strong>Tell me about med-curriculum</strong> — get details on a specific program</li>' +
      '<li><strong>How do I apply?</strong> — see admissions steps (I\'ll use your last program level)</li>' +
      '<li><strong>Financial aid estimate</strong> — after picking a program</li>' +
      '<li><strong>Request info</strong> — I\'ll walk you through the form</li>' +
      '</ul>'
    );
  }

  /* ---- Form wiring ---- */

  function onSubmit(ev) {
    ev.preventDefault();
    var text = chatInput.value.trim();
    if (!text) return;
    chatInput.value = '';
    appendMessage('user', '<p>' + esc(text) + '</p>');
    setTyping(true);
    handleUserMessage(text).then(function (html) {
      appendMessage('agent', html);
    }).catch(function (err) {
      appendMessage('agent', '<p>Something went wrong: ' + esc(err && err.message ? err.message : String(err)) + '</p>');
    }).then(function () {
      setTyping(false);
    });
  }

  chatForm.addEventListener('submit', onSubmit);
  chatInput.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && !ev.shiftKey) {
      ev.preventDefault();
      chatForm.requestSubmit();
    }
  });

  appendMessage(
    'agent',
    '<p><strong>Hi, welcome to Demo University.</strong> I\'m an AI assistant powered by this site\'s WebMCP tools.</p>' +
    '<p>Try asking me something like:</p>' +
    '<ul class="agent-list">' +
    '<li><strong>Find me an online master\'s in education</strong></li>' +
    '<li><strong>How much does it cost?</strong></li>' +
    '<li><strong>How do I apply?</strong></li>' +
    '<li><strong>I want to request info</strong></li>' +
    '</ul>' +
    '<p class="muted">Watch the Tool Inspector panel to see every WebMCP call in real time.</p>'
  );
})();

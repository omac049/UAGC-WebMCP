(function () {
  if (navigator.modelContext) {
    return;
  }

  const registry = [];

  function ensureConsentStyles() {
    if (document.getElementById('webmcp-consent-styles')) {
      return;
    }
    const style = document.createElement('style');
    style.id = 'webmcp-consent-styles';
    style.textContent = `
      .consent-dialog-overlay { font-family: system-ui, -apple-system, sans-serif; }
      .consent-dialog h2 { margin: 0 0 0.5rem; font-size: 1.15rem; color: #1a365d; }
      .consent-dialog p { margin: 0 0 0.75rem; color: #2d3748; font-size: 0.95rem; line-height: 1.5; }
      .consent-dialog .consent-params { background: #f7fafc; border: 1px solid #e2e8f0; border-radius: 0.5rem; padding: 0.75rem; margin: 0 0 1rem; max-height: 12rem; overflow: auto; font-size: 0.85rem; white-space: pre-wrap; word-break: break-word; }
      .consent-dialog .consent-actions { display: flex; gap: 0.75rem; justify-content: flex-end; flex-wrap: wrap; }
      .consent-dialog button { cursor: pointer; border-radius: 0.5rem; padding: 0.5rem 1rem; font-size: 0.95rem; font-weight: 600; border: none; }
      .consent-dialog .consent-approve { background: #1a365d; color: #fff; }
      .consent-dialog .consent-approve:hover { background: #2c5282; }
      .consent-dialog .consent-deny { background: #edf2f7; color: #1a202c; }
      .consent-dialog .consent-deny:hover { background: #e2e8f0; }
    `;
    document.head.appendChild(style);
  }

  function showConsentDialog(tool, params) {
    ensureConsentStyles();
    return new Promise((resolve, reject) => {
      const overlay = document.createElement('div');
      overlay.className = 'consent-dialog-overlay webmcp-consent-backdrop';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-labelledby', 'webmcp-consent-title');
      overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:10000;display:flex;align-items:center;justify-content:center;padding:1rem;';

      const box = document.createElement('div');
      box.className = 'consent-dialog';
      box.style.cssText =
        'max-width:32rem;width:100%;background:#fff;border-radius:0.75rem;padding:1.25rem 1.5rem;box-shadow:0 25px 50px -12px rgba(0,0,0,0.35);';

      const title = document.createElement('h2');
      title.id = 'webmcp-consent-title';
      title.textContent = `Allow “${tool.name}”?`;

      const desc = document.createElement('p');
      desc.textContent = tool.description || 'This tool wants to run on this site.';

      const paramsLabel = document.createElement('p');
      paramsLabel.style.margin = '0 0 0.35rem';
      paramsLabel.style.fontWeight = '600';
      paramsLabel.style.fontSize = '0.9rem';
      paramsLabel.textContent = 'Parameters being sent';

      const pre = document.createElement('pre');
      pre.className = 'consent-params';
      try {
        pre.textContent = JSON.stringify(params ?? {}, null, 2);
      } catch {
        pre.textContent = String(params);
      }

      const actions = document.createElement('div');
      actions.className = 'consent-actions';

      const denyBtn = document.createElement('button');
      denyBtn.type = 'button';
      denyBtn.className = 'consent-deny';
      denyBtn.textContent = 'Deny';

      const approveBtn = document.createElement('button');
      approveBtn.type = 'button';
      approveBtn.className = 'consent-approve';
      approveBtn.textContent = 'Approve';

      function cleanup() {
        overlay.remove();
        document.removeEventListener('keydown', onKey);
      }

      function onKey(ev) {
        if (ev.key === 'Escape') {
          cleanup();
          reject(new Error('Consent denied'));
        }
      }

      denyBtn.addEventListener('click', () => {
        cleanup();
        reject(new Error('Consent denied'));
      });

      approveBtn.addEventListener('click', () => {
        cleanup();
        resolve();
      });

      document.addEventListener('keydown', onKey);

      actions.appendChild(denyBtn);
      actions.appendChild(approveBtn);
      box.appendChild(title);
      box.appendChild(desc);
      box.appendChild(paramsLabel);
      box.appendChild(pre);
      box.appendChild(actions);
      overlay.appendChild(box);

      document.body.appendChild(overlay);
      approveBtn.focus();
    });
  }

  navigator.modelContext = {
    version: 'polyfill-1.0',

    registerTool(toolDefinition) {
      if (!toolDefinition || typeof toolDefinition.name !== 'string' || !toolDefinition.name.trim()) {
        throw new Error('registerTool: name is required');
      }
      if (typeof toolDefinition.execute !== 'function') {
        throw new Error('registerTool: execute must be a function');
      }
      const idx = registry.findIndex((t) => t.name === toolDefinition.name);
      if (idx >= 0) {
        registry[idx] = toolDefinition;
      } else {
        registry.push(toolDefinition);
      }
    },

    getTools() {
      return registry.map(({ name, description, inputSchema, annotations }) => ({
        name,
        description,
        inputSchema,
        annotations
      }));
    },

    invokeTool(name, params) {
      return (async () => {
        const tool = registry.find((t) => t.name === name);
        if (!tool) {
          throw new Error(`Tool not found: ${name}`);
        }
        const annotations = tool.annotations || {};
        if (annotations.requiresConsent === true) {
          await showConsentDialog(tool, params);
        }
        return tool.execute(params);
      })();
    }
  };

  function logPolyfillLoaded() {
    const n = registry.length;
    console.log(`WebMCP Polyfill v1.0 loaded — ${n} tool${n === 1 ? '' : 's'} registered`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', logPolyfillLoaded, { once: true });
  } else {
    setTimeout(logPolyfillLoaded, 0);
  }
})();

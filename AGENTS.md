## Learned User Preferences

- When given external feedback on long-form strategy docs, treat it as material to evaluate and prioritize—not a mandate to implement every suggestion.
- For executive-facing HTML, favor a simple layer of clarity; an "agentflow"-style narrative works well for leadership audiences.
- Large documentation or clarity passes can be requested as parallel work ("fleet of agents" / multi-agent execution).
- Frame pilot success around experience quality (e.g., multi-step journey completion, session depth, tool reliability), not RFI conversion or lift as the headline KPI.
- It is acceptable to illustrate a full RFI path in demos when it shows human-in-the-loop consent and browser-mediated PII—not when reframing the pilot's success metrics as lead-gen.
- Keep the public landing page (`index.html`) aligned with the authoritative markdown (metrics, reference counts, pilot scope, links).
- Prefer readable markdown in the browser via the shared viewer (`docs.html`) rather than expecting raw `.md` to render well; treat `index.html` and `docs.html` as one connected site with cross-navigation.
- For the runnable prototype and demo copy, use real UAGC branding and `uagc.edu`-aligned naming rather than a fictional "demo university," so the example reads as a plausible institutional deployment.
- The primary deliverable is the **agent bridge** (`agent-bridge/`), not the demo prototype. The bridge is the production component that would live in the uagc.edu stack, using real site data via scraping since we don't have direct site access.

## Learned Workspace Facts

- This workspace is the UAGC WebMCP materials: core white paper, executive brief, technical/legal appendices, `index.html` landing page, and `docs.html` (marked.js) for styled markdown; document links use `docs.html#<filename>.md`.
- The strategic story centers on a dual-layer approach: sanctioned WebMCP-style agent access for legitimate use cases and defensive tarpit/honeypot patterns for unauthorized scraping, with legal review called out for defensive measures.
- Git remote for this project: `git@github.com:omac049/UAGC-WebMCP.git`.
- A `prototype/` directory provides a self-contained, Node-served WebMCP-style demo (static HTML, sample data, discovery files, chat stub) intended for others to copy and adapt on their own edu sites.
- The `agent-bridge/` directory contains the production MCP server: a Python FastMCP server that scrapes live uagc.edu data, caches it as structured JSON, and exposes it as MCP tools over SSE. Connectable to ChatGPT, Claude Desktop, Cursor, and any MCP client.
- The `index.html` landing page includes an interactive narrative demo of WebMCP-style tool calls through `submitRFI`, framed with browser-mediated consent and a confirmation step (illustrative of human-in-the-loop PII, separate from pilot KPIs).

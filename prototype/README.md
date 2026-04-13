# WebMCP Prototype — Dual-Layer Agentic Web Architecture for Higher Education

## 1. What this is

This folder is a **small Express + static HTML** demo of **Demo University**, a fictional online school. **Layer 1** exposes enrollment-oriented capabilities as **WebMCP-registered tools** backed by JSON APIs. **Layer 2** adds optional **tarpit middleware**: request scoring, artificial delays, redirects into a **synthetic “maze”**, and **canary strings** in honeypot content to illustrate deterrence for unauthorized scraping.

## 2. Quick start

From your machine (Node.js required):

```bash
git clone git@github.com:omac049/UAGC-WebMCP.git
cd UAGC-WebMCP/prototype
npm install
npm start
```

Then open [http://localhost:3000/](http://localhost:3000/) in a browser. The agent playground lives at [http://localhost:3000/agent.html](http://localhost:3000/agent.html).

For auto-restart during edits:

```bash
npm run dev
```

## 3. Architecture overview

- **Layer 1 — WebMCP tools:** Pages under `public/` register five tools in `public/js/register-tools.js`. Each tool calls REST handlers in `routes/api.js` that read JSON fixtures in `data/`. Discovery for agents is served from `aeo/` at **`/llms.txt`**, **`/agents.md`**, and **`/.well-known/webmcp`** (wired in `server.js`).
- **Layer 2 — Tarpit defense:** `tarpit/middleware.js` scores requests (user-agent heuristics, generic UA, request rate, honeypot path hits). High scores cause delays or a **302** into **`/trap/maze/...`**, handled by `tarpit/maze.js` with HTML from `tarpit/content.js`. Operator-visible counters: **`GET /tarpit/stats`**.

## 4. Project structure

```
prototype/
├── server.js              # Express app: tarpit, API router, static files, AEO routes
├── package.json           # Dependencies and npm scripts
├── routes/
│   └── api.js             # REST API for programs, admissions, RFI, financial aid
├── data/
│   ├── programs.json      # Program catalog
│   ├── admissions.json    # Admissions steps by student type and level
│   └── financial-aid.json # Aid ranges and copy for estimates
├── public/                # Static site (HTML, CSS, JS)
│   ├── agent.html         # WebMCP tool demo (requires browser with modelContext)
│   ├── programs.html      # Program browsing UI
│   ├── admissions.html    # Admissions UI
│   ├── request-info.html  # RFI form UI
│   └── js/
│       ├── register-tools.js   # Tool definitions → fetch /api/*
│       └── webmcp-polyfill.js  # Shim when native API absent
├── aeo/                   # Agentic Engine Optimization / discovery (not only “public/”)
│   ├── llms.txt           # llmstxt.org-style site summary
│   ├── agents.md          # Agent behavior and safety guide
│   └── webmcp.json        # JSON manifest served at /.well-known/webmcp
└── tarpit/
    ├── middleware.js      # Scoring, delay, redirect, /tarpit/stats
    ├── maze.js            # Slow chunked HTML + link farm under /trap/maze
    └── content.js         # Synthetic prose + canary token injection
```

## 5. Layer 1: WebMCP tools

| Tool | What it does |
|------|----------------|
| **searchPrograms** | Keyword search on the catalog; optional `level` and `modality` filters. |
| **getProgramDetails** | Full program record by stable `programId`. |
| **getAdmissionsSteps** | Ordered checklist for `programLevel` and `studentType` (`new` / `transfer`). |
| **submitRFI** | POST prospect contact data; **requires explicit browser consent** in this demo. |
| **getFinancialAidEstimate** | Tuition + illustrative aid range + net cost + scholarship names for a program and enrollment intensity. |

Implementation reference: `public/js/register-tools.js` and `routes/api.js`.

## 6. Layer 2: Tarpit defense

- **Bot detection:** The middleware inspects **User-Agent** (missing/generic UA, “bad bot” substrings vs. a small allowlist of known crawlers) and **request rate** per IP over sliding windows.
- **Honeypot paths:** Requests whose path starts with **`/research/`**, **`/faculty/`**, or **`/internal-docs/`** receive a large score contribution—they are not real site sections in this prototype.
- **Maze:** Scores above a threshold trigger a **redirect** to **`/trap/maze/<random segments>`**. Responses stream slowly and include many **decoy links** to keep automated crawlers busy.
- **Canary tokens:** `tarpit/content.js` embeds unique-looking strings in maze HTML so copied text can be traced if it appears in leaked corpora.

Deploying Layer 2 against real traffic requires **isolation, monitoring, and legal review**; here it is illustrative only.

## 7. AEO discovery files

| URL | File | Purpose |
|-----|------|---------|
| `/llms.txt` | `aeo/llms.txt` | Concise markdown oriented to LLM discovery ([llmstxt.org](https://llmstxt.org/)). |
| `/agents.md` | `aeo/agents.md` | Practical rules: tools vs. scraping, consent, rate limits, honeypots. |
| `/.well-known/webmcp` | `aeo/webmcp.json` | Machine-readable tool manifest (convention aligned with [webmcpregistry.org](https://webmcpregistry.org/) discussions). |

## 8. Customizing for your institution

- **Data:** Edit `data/programs.json`, `data/admissions.json`, and `data/financial-aid.json` to match your catalog and messaging.
- **Branding and copy:** Update HTML under `public/` and styles in `public/css/style.css`.
- **Domain and URLs:** Replace `localhost:3000` in `aeo/llms.txt`, user-facing links, and the `institution.domain` field in `aeo/webmcp.json`; use HTTPS in production.
- **Tool contracts:** Adjust names, schemas, or endpoints in `public/js/register-tools.js` and keep `aeo/webmcp.json` in sync.
- **Tarpit:** Tune thresholds and path lists in `tarpit/middleware.js`; confirm maze routes are not linked from legitimate navigation.

## 9. Testing the agent demo

1. Open [http://localhost:3000/agent.html](http://localhost:3000/agent.html) in a **WebMCP-capable** browser (or with the bundled polyfill if you are experimenting).
2. Try **read-only** flows first: search for a keyword (e.g. “nursing” or “business”), open **getProgramDetails** for a returned id, then **getAdmissionsSteps** for a level you care about.
3. Run **getFinancialAidEstimate** with a valid `programId` from the catalog and an `enrollmentStatus` of `full-time`, `half-time`, or `less-than-half`.
4. For **submitRFI**, complete the on-page consent if prompted, then submit—watch the server console for the logged line (this demo does not persist to a database).

## 10. API reference

All paths are relative to the server root (default port **3000**).

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/programs/search?keyword=&level=&modality=` | Search programs; `keyword` required. |
| `GET` | `/api/programs/:id` | Program detail by id. |
| `GET` | `/api/admissions?programLevel=&studentType=` | Admissions steps; `programLevel` required; `studentType` defaults to `new`. |
| `POST` | `/api/rfi` | JSON body: `firstName`, `lastName`, `email`, `programInterest`; optional `phone`. |
| `GET` | `/api/financial-aid/:programId?enrollmentStatus=` | Aid/tuition estimate; `enrollmentStatus` required. |
| `GET` | `/llms.txt` | Plain-text llms.txt content. |
| `GET` | `/agents.md` | Agent guide (markdown). |
| `GET` | `/.well-known/webmcp` | WebMCP JSON manifest. |
| `GET` | `/tarpit/stats` | JSON summary of tarpit scoring counters (demo operator aid). |
| `GET` | `/trap/maze/{*path}` | Synthetic maze pages (defense demo; not for legitimate agents). |
| `GET` | `/*` | Static files from `public/` (e.g. `/`, `/programs.html`, `/agent.html`). |

## 11. Links

- **White paper (repository root, sibling of `prototype/`):** open `docs.html` in a browser and jump to the paper via the fragment `docs.html#UAGC_WebMCP_WhitePaper.md`, or read `UAGC_WebMCP_WhitePaper.md` directly. On GitHub: [UAGC-WebMCP — White paper source](https://github.com/omac049/UAGC-WebMCP/blob/main/UAGC_WebMCP_WhitePaper.md).
- **W3C Web Machine Learning Community Group:** [https://www.w3.org/community/webmachinelearning/](https://www.w3.org/community/webmachinelearning/)
- **WebMCP CG draft (spec):** [https://webmachinelearning.github.io/webmcp/](https://webmachinelearning.github.io/webmcp/)
- **llms.txt specification:** [https://llmstxt.org/](https://llmstxt.org/)
- **Web MCP Registry:** [https://webmcpregistry.org/](https://webmcpregistry.org/)

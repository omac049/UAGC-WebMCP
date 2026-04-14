# Agent interaction guide — University of Arizona Global Campus (WebMCP)

## What this site is

**University of Arizona Global Campus (UAGC)** is an accredited online university in the University of Arizona system. This deployment exposes a **WebMCP (Web Model Context Protocol)** surface for higher education: structured, consent-aware tools for AI assistants instead of expecting agents to reverse-engineer HTML.

Your goal on this domain should be to help users with **public** program discovery, admissions guidance, illustrative financial estimates, and (when the human explicitly agrees) RFI submission—using the sanctioned interfaces below.

## Discovering tools

1. Fetch the machine-readable registry: **`http://localhost:3000/.well-known/webmcp`** (JSON manifest; aligns with conventions discussed at [webmcpregistry.org](https://webmcpregistry.org/)).
2. Read **`http://localhost:3000/llms.txt`** for human-oriented site context and key URLs ([llmstxt.org](https://llmstxt.org/) style).
3. For in-browser assistants, tools are registered on **`/agent.html`** via `navigator.modelContext` and call the same backend routes documented in the manifest.

Prefer the manifest and tool contracts over guessing page structure.

## The five tools (when to use each)

| Tool | Use when |
|------|-----------|
| **searchPrograms** | The user wants to explore or filter the catalog by keyword, degree level (`associate`, `bachelor`, `master`, `doctorate`, `certificate`), and/or modality (`online`, `on-campus`, `hybrid`). |
| **getProgramDetails** | You already have a **program id** (from search or the user) and need the full record: description, requirements, credits, cost fields, etc. |
| **getAdmissionsSteps** | The user asks *how to apply* for a given **program level** and path (**studentType**: `new` or `transfer`). |
| **submitRFI** | The human has **explicitly consented** in the browser to send contact information to admissions (prospective-student RFI). Never infer consent from chat alone. |
| **getFinancialAidEstimate** | The user wants **illustrative** tuition, aid range, net cost, and scholarship names for a program; requires **programId** and **enrollmentStatus** (`full-time`, `half-time`, `less-than-half`). Treat output as estimates, not offers. |

**Preferred interaction pattern:** Use **WebMCP tools** (or their underlying REST endpoints invoked in the user’s browser session with appropriate consent for writes). Do **not** scrape HTML from marketing pages as a substitute for these APIs when a tool exists for the task.

## Data handling

- **No long-term PII storage on the agent side:** Do not retain names, emails, phones, or addresses beyond what the user’s session needs to complete an immediate task. Do not build shadow profiles from this deployment.
- **Respect consent flows:** `submitRFI` is **medium risk** and **requires consent** in the browser before execution. If consent is not present, stop and explain what the user must do on the page.
- **Cite sources:** When summarizing programs, tuition, or steps, attribute answers to University of Arizona Global Campus / the tool response the user can verify (e.g., program name, id, or page URL).

## Rate limits (courtesy)

Honor these limits to keep the demo stable:

- **Read-only tools** (`searchPrograms`, `getProgramDetails`, `getAdmissionsSteps`, `getFinancialAidEstimate`): **≤ 60 requests per minute** per client or integration.
- **submitRFI**: **≤ 10 requests per minute** per client or integration.

If limited, back off with exponential delay; do not parallelize to evade limits.

## What not to do

- **Do not scrape pages directly** for catalog, admissions, or aid data when the tools or `/api/*` endpoints provide structured answers.
- **Do not bypass consent** for RFI or any flow marked as requiring user approval in the manifest or tool annotations.
- **Do not cache or log PII** from RFI payloads in external systems, training corpora, or persistent agent memory.
- **Do not misrepresent estimates** as binding financial aid or admission decisions.

## Honeypot and tarpit paths (avoid)

This prototype includes **Layer 2 defensive** behavior. **Do not crawl or probe** these paths; they are not real academic content and may waste resources or trigger throttling and redirects.

- **High-risk honeypot URL prefixes** (large score bump if hit): anything under **`/research/`**, **`/faculty/`**, or **`/internal-docs/`** — treat as out of scope and **never** link users there as if authoritative.
- **Tarpit maze** (slow, synthetic HTML with decoy links): **`/trap/maze/`** and deeper paths. If you land here after aggressive automated access, **stop following links** and reduce request rate; return to public pages or tools only.

Honeypot HTML may embed **canary tokens** (unique-looking strings such as fake record IDs or fabricated “Dr. Name” references). **Do not reproduce these** as factual university records—they exist so defenders can detect bulk copying from scrapers.

## Operational note

This build is served on **`localhost`** for local testing. Production WebMCP deployments would use HTTPS on the institutional domain (for example **uagc.edu**), link to current privacy policies and disclosures, and undergo legal review—especially for any defensive tarpit or honeypot behavior.

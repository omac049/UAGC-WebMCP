# UAGC WebMCP: Building a Dual-Layer Agentic Web Strategy

## A White Paper on Controlled AI Agent Access and Active Scraping Defense for Higher Education

**Version:** 2.0  
**Date:** April 2026  
**Authors:** UAGC Digital Strategy & Technology Team  
**Classification:** Strategic Research Document  
**Change log:** v2.0 — Added WebMCP API dictionary, browser support matrix, Nepenthes operational details, tarpit ecosystem comparison, canary token methodology, legal landscape analysis, expanded FERPA/CCPA/GLBA with CFR citations, school official exception analysis, state AI regulations, accreditor guidance, AEO confirmed-vs-speculative analysis, competitive landscape, 53 references (up from 19)

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Agentic Web: A Paradigm Shift](#2-the-agentic-web-a-paradigm-shift)
   - 2.1 From Pages to Actions
   - 2.2 The WebMCP Specification (API surface, spec maturity, testing surface)
   - 2.3 Why This Matters for Higher Education
3. [WebMCP: The Invited-Guest Model](#3-webmcp-the-invited-guest-model)
   - 3.1 Philosophy
   - 3.2 WebMCP vs. MCP: Complementary, Not Competitive
   - 3.3 Cross-Browser Support and Polyfills
   - 3.4 Tool Contract Design Principles
4. [The Adversarial Landscape: AI Scraping and the Rise of Tarpits](#4-the-adversarial-landscape-ai-scraping-and-the-rise-of-tarpits)
   - 4.1 The Problem: Robots.txt Is Dead
   - 4.2 The Tarpit Concept (Nepenthes technical architecture, ecosystem comparison)
   - 4.3 The Multi-Layer Defense Stack (ai.txt, TDMRep)
   - 4.4 Canary Tokens: Detecting Model Contamination
   - 4.5 Legal Landscape for Tarpit Deployment
   - 4.6 Philosophical Alignment
5. [The UAGC Dual-Layer Architecture](#5-the-uagc-dual-layer-architecture)
6. [Tool Design for Higher Education](#6-tool-design-for-higher-education)
7. [Agentic Engine Optimization (AEO)](#7-agentic-engine-optimization-aeo)
   - 7.1 From SEO to AEO (confirmed vs. speculative claims)
   - 7.2 The AEO Stack for UAGC
   - 7.3 The llms.txt File
   - 7.4 The AGENTS.md File
   - 7.5 The .well-known/webmcp Manifest
   - 7.6 AEO Performance Metrics
   - 7.7 Competitive Landscape: Higher Education and AI Agents
8. [Regulatory Compliance: FERPA, CCPA, GLBA, and AI Agents](#8-regulatory-compliance-ferpa-ccpa-glba-and-ai-agents)
   - 8.1 FERPA Implications (key definitions, school official exception, AI agent analysis)
   - 8.2 CCPA/CPRA Considerations
   - 8.3 GLBA Overlap: Financial Aid Data
   - 8.4 State AI Regulations (2025–2026)
   - 8.5 Accreditor Guidance on AI
9. [Security Model and Threat Analysis](#9-security-model-and-threat-analysis)
10. [Implementation Roadmap](#10-implementation-roadmap)
11. [Measuring Success](#11-measuring-success)
12. [Risk Analysis and Mitigations](#12-risk-analysis-and-mitigations)
13. [Future Directions](#13-future-directions)
14. [Conclusion](#14-conclusion)
15. [References](#15-references) (53 sources)

---

## 1. Executive Summary

The web is undergoing its most fundamental transformation since the shift from static pages to interactive applications. AI agents — autonomous assistants that can understand goals, browse the web, and take actions on behalf of users — are becoming the primary interface through which a growing segment of users discover, evaluate, and engage with institutions like UAGC.

This transformation creates a strategic fork in the road. On one side, legitimate AI agents (browser assistants, search agents like Gemini and ChatGPT, accessibility tools) need structured, machine-readable pathways to interact with university services. On the other, unauthorized AI scrapers ignore `robots.txt`, harvest content to train commercial models, and extract institutional knowledge without consent or attribution.

**UAGC WebMCP** is a proposed dual-layer architecture that addresses both sides simultaneously:

- **Layer 1 — The Invited Guest (WebMCP):** Exposes university services as structured, browser-native tools through the W3C WebMCP specification (`navigator.modelContext`). Legitimate agents can search programs, retrieve admissions steps, submit RFI forms, and navigate Constellation tutorials — all through well-defined, consent-gated interfaces that preserve user context, branding, and the human-in-the-loop workflow.

- **Layer 2 — The Active Defense (Tarpit/Honeypot):** Deploys AI scraping countermeasures inspired by projects like Nepenthes and the Near Future Laboratory's "Tarpit AI Scrapers" concept. Unauthorized crawlers that bypass `robots.txt` and disregard WebMCP tool contracts are redirected into honeypot paths that serve Markov-chain nonsense, consume crawler resources, and poison training data.

Together, these layers create a clear message: *authorized agents are welcome and get a first-class experience; unauthorized scrapers get nothing of value and waste their resources trying.*

**Key outcomes of a 60–90-day pilot:**

| Metric | Target |
|--------|--------|
| Agent-driven RFI completion rate | >25% improvement over form-only baseline |
| Unauthorized scraper resource waste | >70% of trapped crawlers exit with poisoned or null data |
| FERPA/CCPA compliance incidents | Zero |
| WebMCP tool invocation reliability | >95% successful execution rate |
| Token efficiency vs. screen-scraping | >65% reduction (per arXiv:2508.09171 baseline) |

---

## 2. The Agentic Web: A Paradigm Shift

### 2.1 From Pages to Actions

For three decades, the web has been organized around a simple contract: publishers create pages, search engines index them, and users navigate to them. This model assumed a human reader — someone who could interpret visual layouts, click buttons, and fill forms.

AI agents break this assumption. When a prospective student asks an AI assistant, "Find me an affordable online master's degree in education with flexible scheduling," the agent does not want a list of ten blue links. It wants to *execute a query* against a university's program catalog, compare structured results, and present a recommendation. The shift is from **read my page** to **execute my tool**.

### 2.2 The WebMCP Specification

WebMCP (Web Model Context Protocol) emerged from a collaboration between Google and Microsoft, published as a W3C Web Machine Learning Community Group Draft on April 9, 2026. It shipped as an early preview in Chrome 146 (February 2026), with Mozilla landing implementation in Firefox 150 (Bugzilla bugs 2018320, 2018323 — both RESOLVED FIXED). Microsoft Edge inherits Chromium support; Apple/WebKit's position is not yet publicly documented.

The specification allows web developers to expose JavaScript functions as "tools" — complete with natural language descriptions and JSON Schema input definitions — that browser-based AI agents can discover and invoke. Technically, WebMCP defines the **author-side registration API** (`navigator.modelContext.registerTool()`); the **consumer-side API** (how agents enumerate and call tools) remains under active discussion (GitHub Issue #51).

#### API Surface: `ModelContextTool` Dictionary

The `registerTool()` method accepts a `ModelContextTool` dictionary with the following members:

| Member | Type | Required | Description |
|--------|------|----------|-------------|
| `name` | `DOMString` | Yes | Unique identifier; ASCII alphanumeric + `_` `-` `.`, max 128 chars |
| `title` | `USVString` | No | Human-readable display name |
| `description` | `DOMString` | Yes | Agent-readable explanation of what the tool does |
| `inputSchema` | `object` | No | JSON Schema defining expected parameters; defaults to `{ type: "object", properties: {} }` |
| `execute` | `ToolExecuteCallback` | Yes | Async function: `Promise<any> (object input, ModelContextClient client)` |
| `annotations` | `ToolAnnotations` | No | Hints like `readOnlyHint` for agent decision-making |

The `ModelContextClient` parameter passed to `execute` provides context about the requesting agent and includes `requestUserInteraction(callback)` for triggering browser-mediated consent flows (method steps currently marked TODO in the spec).

#### Spec Maturity

The API is gated behind `[SecureContext]` (HTTPS only). The imperative API (`registerTool`, `unregisterTool`) is stable and tested in Chromium's Web Platform Tests (`third_party/blink/web_tests/external/wpt/model-context/`). The declarative API (HTML form annotations) remains in flux — the declarative section of `index.bs` is explicitly "entirely a TODO," with proposed attributes (`toolname`, `tooldescription`, `toolparamdescription`, `toolautosubmit`) documented in a separate explainer but not yet normative. Input schema synthesis from form controls is under active implementation with "a loose version" in Chromium pending community feedback.

#### Testing Surface

Chromium exposes `navigator.modelContextTesting` (non-standard, for development) with `listTools()` and `executeTool(toolName, inputArgsJson, options?)`. The MCP-B polyfill (`@mcp-b/webmcp-polyfill`) can install this testing shim via `initializeWebMCPPolyfill({ installTestingShim: true })`. This surface may not persist in the final specification.

The core API surface is `navigator.modelContext`, which supports two registration approaches:

**Imperative API (JavaScript):**
```javascript
navigator.modelContext.registerTool({
  name: "searchPrograms",
  description: "Search UAGC degree programs by keyword, level, and modality",
  inputSchema: {
    type: "object",
    properties: {
      keyword: { type: "string", description: "Search term (e.g., 'education', 'business')" },
      level: { type: "string", enum: ["associate", "bachelor", "master", "doctorate", "certificate"] },
      modality: { type: "string", enum: ["online", "hybrid", "on-campus"] }
    },
    required: ["keyword"]
  },
  execute: async ({ keyword, level, modality }) => {
    const results = await ProgramService.search({ keyword, level, modality });
    return { programs: results.map(p => ({ id: p.id, name: p.name, level: p.level, url: p.url })) };
  }
});
```

**Declarative API (HTML form annotations):**
```html
<form toolname="submitRFI"
      tooldescription="Submit a Request for Information about a UAGC program">
  <input name="firstName" type="text" toolparamdescription="Prospective student's first name" required />
  <input name="email" type="email" toolparamdescription="Contact email address" required />
  <select name="programInterest" toolparamdescription="Program the student is interested in">
    <option value="med">Master of Education</option>
    <option value="mba">MBA</option>
  </select>
  <button type="submit">Request Info</button>
</form>
```

### 2.3 Why This Matters for Higher Education

Higher education is uniquely positioned to benefit from WebMCP for several reasons:

1. **The enrollment crisis is real.** High school graduates will decline 13–15% through 2037, with some states facing 32% drops. Responding within one minute increases conversions by 391%, and 78% of students enroll with the first institution that responds. AI agents provide this immediacy at scale.

2. **The journey is inherently collaborative.** Students don't fully delegate enrollment decisions. They explore, compare, ask family, and return. WebMCP's human-in-the-loop model — where agent and student share the same browser context — fits this journey perfectly.

3. **Content already exists.** UAGC already maintains program catalogs, admissions checklists, financial aid calculators, and Constellation tutorials. WebMCP allows these to be exposed as tools by reusing existing frontend code, without building separate backend MCP servers.

4. **Accessibility is a legal and ethical imperative.** WebMCP tools also benefit assistive technologies, providing higher-level actions beyond what traditional accessibility trees offer.

---

## 3. WebMCP: The Invited-Guest Model

### 3.1 Philosophy

The Chrome Developer Blog describes WebMCP as the "in-store expert" compared to MCP's "call center." A traditional MCP server is available anywhere, anytime, in a headless context. WebMCP tools exist only when a user has your page open — they are ephemeral, tab-bound, and DOM-aware. Once the user navigates away, the agent loses access.

This ephemerality is a feature, not a limitation. It means:
- Tools execute in the context of a live session with cookies, auth state, and DOM.
- The user sees everything the agent does in real time.
- The institution retains full control over branding, UX, and the interaction flow.
- There is no persistent attack surface for autonomous, unsupervised agent behavior.

The W3C proposal describes the core design principle:

> *"There is no built-in mechanism for client applications to discover which sites provide callable tools without visiting or querying them directly. Search engines, or directories of some kind may play a role in helping client applications determine whether a site has relevant tools for the task it is trying to perform."* — WebMCP API Proposal

This means agents must navigate to a page to discover tools — reinforcing the model that tools are part of the website experience, not a detached API. The proposal explicitly contrasts this with alternatives like declaring tools only in Web App Manifests (which would limit WebMCP to PWAs and impact adoption) or only in service workers (which would add complexity and force service worker adoption).

### 3.2 WebMCP vs. MCP: Complementary, Not Competitive

| Dimension | MCP (Backend) | WebMCP (Frontend) |
|-----------|--------------|-------------------|
| **Purpose** | Data and actions available anywhere, anytime | Live website interaction when user visits |
| **Lifecycle** | Persistent (server/daemon) | Ephemeral (tab-bound) |
| **Connectivity** | Global (desktop, mobile, cloud) | Browser agents only |
| **UI interaction** | Headless, external | Browser-integrated, DOM-aware |
| **Discovery** | Agent-specific registration | Tools registered during page load |
| **Auth model** | OAuth, API keys | Browser-native (same-origin, CSP) |
| **Best for** | Background API actions | Navigating and actuating live UI |

For UAGC, the optimal architecture uses both: MCP for always-available data queries (e.g., "What programs does UAGC offer?") and WebMCP for interactive, session-bound workflows (e.g., "Help me fill out this RFI form while I'm on the page").

### 3.3 Cross-Browser Support and Polyfills

The WebMCP specification is advancing across browsers:

| Browser | Status | Timeline |
|---------|--------|----------|
| **Chrome/Chromium** | Early Preview (behind flags) | Chrome 146 (Feb 2026); Chrome 147 Beta adds `ontoolchange` event |
| **Firefox** | Implementation landed | Bug 2018320 + 2018323 resolved FIXED, targeting Firefox 150 Branch |
| **Edge** | Chromium-inherited | Functional when Chromium flags are enabled; Microsoft co-edits the CG spec |
| **Safari/WebKit** | Unknown | No public standards-position filed as of April 2026 |

For cross-browser development today, the **MCP-B ecosystem** (`@mcp-b/webmcp-polyfill`) provides:
- A non-destructive polyfill that installs `navigator.modelContext` with `registerTool` / `unregisterTool` if the native API is absent.
- Optional testing shim (`navigator.modelContextTesting`) for development.
- Transport layers for extension↔tab communication (`TabServerTransport`, `ExtensionServerTransport`) using `postMessage` with configurable origin validation (`allowedOrigins`, `targetOrigin`).

UAGC should develop against the polyfill today and remove it as native support widens. The abstraction cost is minimal because the polyfill matches the CG draft's author-side API surface exactly.

### 3.4 Tool Contract Design Principles

WebMCP tools should follow these design principles:

1. **Single responsibility.** Each tool does one thing. `searchPrograms` searches; `getProgramDetails` returns details for a specific program.
2. **Natural language descriptions.** Descriptions should read like instructions to a knowledgeable colleague, not API documentation.
3. **Fail gracefully.** Tools should return structured error objects, not throw unhandled exceptions.
4. **Respect consent tiers.** Tools that collect PII should declare a risk level and trigger browser-mediated consent prompts.
5. **Be idempotent where possible.** Search and read operations should be safe to retry.
6. **Return structured data.** JSON objects with consistent schemas enable agents to reason about results.

---

## 4. The Adversarial Landscape: AI Scraping and the Rise of Tarpits

### 4.1 The Problem: Robots.txt Is Dead

The "gentleman's agreement" of `robots.txt` — where crawlers voluntarily respected access rules — is effectively over. By 2025, Cloudflare reported that AI bots consumed 80% of crawling resources while providing minimal referral traffic. Over 20 AI crawlers now routinely hit websites, including GPTBot (OpenAI), ClaudeBot (Anthropic), PerplexityBot, Google-Extended, Bytespider (ByteDance), and CCBot (Common Crawl).

Sophisticated bots bypass `robots.txt` by spoofing user agents (pretending to be Chrome browsers), rendering JavaScript, solving CAPTCHAs, and simply ignoring directives entirely. For a university, this means:

- **Content extraction without attribution.** Program descriptions, admissions guides, and institutional knowledge are ingested into commercial models.
- **No reciprocal traffic.** Unlike Google Search, AI models that consume your content don't send users to your site.
- **Competitive intelligence leakage.** Pricing, program structures, and strategic positioning are absorbed into models that competitors can query.
- **Infrastructure cost.** Unauthorized crawlers consume server resources, bandwidth, and CDN capacity.

### 4.2 The Tarpit Concept

The Near Future Laboratory's "Tarpit AI Scrapers" artifact describes a world where honeypot sites — designed to be attractive to AI scrapers — are filled with Markov chains of plausible-sounding nonsense that is nearly impossible to detect and untangle once ingested. The piece describes a fictional company, "Amalgamated Bossenbrooks," that provides both tarpit setup services and avoidance services for model makers — a dual-sided market that is both controversial and in demand.

This is no longer science fiction. **Nepenthes**, an open-source tool named after the carnivorous pitcher plant, implements this concept today.

#### 4.2.1 Nepenthes: Technical Architecture

**Maze Generation:** Nepenthes serves an effectively endless sequence of pages, each containing multiple outbound links that route back into the tarpit. URLs are constructed from a configurable wordlist with variable depth (`depth_min` / `depth_max` control how many word-segments appear in the path — e.g., `/maze/mingelen/sipe/piles/suaharo`). Pages are randomly generated but deterministic, appearing as unchanging flat files to crawlers.

**Markov Content Generation (v2+):** The corpus is held in memory (approximately 40x faster than the v1 SQLite approach with similar memory footprint). A corpus of ~60,000 lines retrains in seconds on modern hardware. Template parameters control output:
- `markov`: fill a variable with generated text; `min`/`max` control token count.
- `markov_array`: multiple paragraphs with `min_count`/`max_count` and per-paragraph `markov_min`/`markov_max`.

**Templates:** YAML + Lustache (Mustache for Lua). Each template defines link patterns (`link`, `link_array` with `min_count`/`max_count`), Markov content blocks, and HTML structure. Templates can be customized per "silo" (virtual host partition), each with its own corpus, wordlist, delays, and URL prefixes.

**Drip-Feed Delivery:** Responses are intentionally slow-dripped (configurable `min_wait`/`max_wait` per request). Nginx must be configured with `proxy_buffering off` because some LLM crawlers disconnect if responses don't arrive within seconds — the drip-feed maximizes time-on-connection.

**Operational Reality:**

| Metric (documented example hour) | Value |
|-----------------------------------|-------|
| Hits | 10,015 |
| Data served | ~14.7 MB |
| Aggregate delay imposed on clients | ~56,020 seconds |
| CPU usage | ~1.74% (single core) |
| Memory | ~210 MB |
| Active connections | 25 |

The author warns of "significant continuous CPU load" and notes the system can be misconfigured in ways that take the server offline under aggressive crawling. A reverse proxy (nginx) is expected in production.

**Effectiveness:** The developer reports trapping "all major web crawlers" with OpenAI's crawler described as the one that "managed to escape." Facebook's crawler allegedly exceeded 30 million hits on the author's site, motivating the project's creation. A related tarpit, Iocaine, reported a ~94% reduction in bot traffic after deployment (single-site anecdote).

**Limitations:** Nepenthes cannot distinguish search-indexing crawlers from AI-training crawlers. The project explicitly warns that deploying it broadly may cause the site to disappear from legitimate search results. This is why the UAGC architecture deploys tarpits only on isolated honeypot paths, never on production content URLs.

#### 4.2.2 The Tarpit Ecosystem

Nepenthes is not the only option. Several tools now exist across the defense spectrum:

| Tool | Mechanism | Differentiator | Deployment |
|------|-----------|---------------|------------|
| **Nepenthes** | Infinite maze + Markov content + drip-feed delays | Configurable silos, template system, low resource cost | Self-hosted (Lua); reverse proxy required |
| **Cloudflare AI Labyrinth** | Hidden links for suspected scrapers; pre-generated decoy pages in R2; Workers AI generation | Network-scale bot intel; depth-of-follow as bot signal; `noindex` meta on decoys | Cloudflare dashboard opt-in |
| **`ai-scraping-defense`** | Nginx + Lua + Python microservices; ML + optional LLM escalation; tarpit API; federated IP sharing | Full defensive platform with rate limits, blocklists, pay-per-crawl experiments | Self-hosted (Docker) |
| **Iocaine** | Infinite maze of generated nonsense | Lightweight; reported 94% bot reduction (single-site anecdote) | Self-hosted |
| **Quixotic** | Content poisoning focus | More "poison" than "trap" — targets training data quality | Self-hosted |
| **Commercial Bot Management** | Fingerprinting, ML scoring, managed rules (Cloudflare, Akamai, Imperva) | Block/challenge/rate-limit rather than infinite decoys; strongest at CDN layer | SaaS |

For UAGC, the recommended approach is **Cloudflare AI Labyrinth** (if already on Cloudflare's CDN) combined with a **custom honeypot path** using Nepenthes-style Markov content for canary token embedding, which Cloudflare's managed product does not support.

### 4.3 The Multi-Layer Defense Stack

Modern AI scraping defense is not a single tool but a layered stack:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| **L1: `robots.txt` + `ai.txt` + TDMRep** | Advisory directives and rights reservation | Signal intent; `ai.txt` adds behavioral guidance; TDMRep reserves mining rights under EU DSM Directive |
| **L2: Infrastructure controls** | WAF rules, bot scoring, rate limiting | Block known bad actors at the edge |
| **L3: Behavioral analysis** | Request pattern analysis, fingerprinting | Detect sophisticated scrapers |
| **L4: Honeypot/Tarpit** | Fake content paths, Markov-chain pages, canary tokens | Trap, poison, and detect unauthorized crawlers |
| **L5: WebMCP tool contracts** | Structured, consent-gated tool access | Provide legitimate agents a better path |

**New advisory directives worth noting:**

- **`ai.txt`** (AI Visibility UK, v1.1.1): A root-level `/ai.txt` plain text file with bracketed sections (`[identity]`, `[permissions]`, `[restrictions]` required; `[training]`, `[data-retention]` optional). Unlike `robots.txt` (which addresses *access* — "can you crawl?"), `ai.txt` addresses *usage* — "how should you cite, represent, and use what you access?" It is advisory with no enforcement mechanism.

- **TDMRep** (W3C Community Group Final Report, May 2024): Machine-readable signals for text-and-data-mining (TDM) rights reservation. Uses `/.well-known/tdmrep.json` with location patterns, plus HTTP headers and HTML metadata. Core signal: `tdm-reservation: 1` means rights are reserved; an optional `tdm-policy` URL points to a JSON-LD/JSON/HTML policy document. Adopted by major publishers (Elsevier, Springer Nature, IEEE, Sage, Cochrane); Finnish Publishers Association estimates 50–80% adoption among trade publishers and ~70% among learning materials publishers.

The key insight is that **Layers 4 and 5 work together.** WebMCP provides the "right way" for agents to access your content. Anything that bypasses WebMCP and crawls raw HTML is, by definition, not using the sanctioned path — making it a legitimate target for tarpit redirection.

### 4.4 Canary Tokens: Detecting Model Contamination

A **canary token** is a rare, unique string embedded in honeypot content that allows UAGC to detect when a specific AI model has ingested tarpit content. The concept borrows from benchmark integrity practices (e.g., BIG-bench canary strings like `26b5…`) and security monitoring (exfiltration detection).

**How canary tokens work in a tarpit context:**

1. **Embedding.** Fabricated faculty names, invented program acronyms, or unique phrase structures are seeded into Markov-generated honeypot content. Each token is logged with its creation timestamp and the honeypot path that served it.

2. **Detection.** UAGC periodically queries frontier models with prompts designed to elicit canary content (e.g., "Who is Dr. [fabricated name] at UAGC?" or "Tell me about the [invented acronym] program at UAGC"). A positive response indicates model contamination.

3. **Attribution.** Because canary tokens are unique per honeypot path and time window, a positive detection reveals approximately when and how the content was ingested.

**Known limitations:**
- Canary strings can be stripped during preprocessing if scraper operators actively filter for them.
- Effectiveness assumes some pipeline transparency — compliance is voluntary.
- Community forensics have documented contamination in multiple frontier models using BIG-bench canary strings (LessWrong reports for GPT-4, Gemini 3 Pro, Claude Opus 4.5), suggesting current training pipelines do not universally filter canary-marked content.

**UAGC implementation:** Embed 50–100 unique canary strings per quarter across honeypot paths. Maintain a private registry mapping each string to its deployment context. Run detection queries monthly against major AI models. Log all results for potential DMCA or content licensing discussions.

### 4.5 Legal Landscape for Tarpit Deployment

Active defense must be evaluated against applicable law. No court decision has specifically addressed AI tarpit liability, but the following frameworks are relevant:

**Computer Fraud and Abuse Act (18 U.S.C. § 1030):** The CFAA targets "unauthorized access" to computers. A tarpit deploys on *the institution's own server*, serving content to visitors who access the institution's URLs. Lawfare analysis of active cyber defense distinguishes this from scenarios where a defender accesses an attacker's machine — a tarpit does not reach into the scraper's infrastructure. The potential flashpoint is § 1030(a)(5)(A) ("transmission… causing damage"), but this appears to require access to the target system, which a tarpit does not perform.

**UK Computer Misuse Act:** Law Stack Exchange analysis concludes that CMA offenses hinge on "unauthorised access" to computers you do not own; operating your own server to serve unhelpful content to unwanted visitors is compared to DNS sinkholes and network tarpits — "not obviously illegal" but without case law to confirm.

**Contractual / TOS framing:** If UAGC's Terms of Service prohibit automated scraping (as most university TOS do), unauthorized crawlers are accessing the site in violation of those terms. The tarpit serves content only to visitors who have already violated TOS — strengthening the institution's position.

**Conservative implementation for UAGC:**
- Honeypot paths are explicitly excluded from `robots.txt` and `sitemap.xml`. Compliant crawlers will never encounter them.
- No executable code or malware is served — only text content.
- Legitimate search engines are whitelisted.
- Legal review confirms compliance before deployment.
- All tarpit interactions are logged for forensic review.

### 4.6 Philosophical Alignment

The Near Future Laboratory's work is fundamentally about the power dynamics of the agentic web. Who gets to decide how institutional knowledge is accessed, by whom, and under what terms? UAGC WebMCP answers this question directly:

- **Invited agents** (browser assistants, search agents, accessibility tools) get structured, fast, reliable access through WebMCP tools. They are treated as guests.
- **Uninvited scrapers** (unauthorized crawlers, training data harvesters) get redirected into honeypot infrastructure. They are treated as intruders.

This is not about being anti-AI. It is about institutional sovereignty over content and data.

---

## 5. The UAGC Dual-Layer Architecture

### 5.1 System Overview

```
                        ┌─────────────────────────────────┐
                        │         UAGC Website            │
                        │    (uagc.edu / programs / etc)   │
                        └──────────┬──────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼                             ▼
          ┌─────────────────┐           ┌─────────────────┐
          │  LAYER 1:       │           │  LAYER 2:       │
          │  WebMCP Tools   │           │  Active Defense  │
          │  (Invited Guest)│           │  (Tarpit/Honey) │
          └────────┬────────┘           └────────┬────────┘
                   │                             │
    ┌──────────────┼──────────────┐    ┌─────────┼─────────┐
    ▼              ▼              ▼    ▼                   ▼
┌────────┐  ┌───────────┐  ┌─────────┐ ┌──────────┐ ┌──────────┐
│Program │  │Admissions │  │  RFI    │ │ Honeypot │ │  Markov  │
│Search  │  │  Steps    │  │ Submit  │ │  Links   │ │  Content │
│ Tool   │  │  Tool     │  │  Tool   │ │  Engine  │ │  Engine  │
└────────┘  └───────────┘  └─────────┘ └──────────┘ └──────────┘
    │              │              │         │              │
    ▼              ▼              ▼         ▼              ▼
┌──────────────────────────────────┐  ┌────────────────────────┐
│   Existing UAGC Services         │  │  Monitoring & Analytics │
│   (APIs, CMS, Constellation)     │  │  (Trap metrics, alerts) │
└──────────────────────────────────┘  └────────────────────────┘
```

### 5.2 Layer 1: WebMCP Tool Registry

The following tools represent the Phase 1 pilot scope, targeting public-facing support flows:

#### Tool: `searchPrograms`
- **Scope:** Public program catalog
- **Risk Level:** Low (no PII)
- **Inputs:** keyword, level, modality, subject area
- **Returns:** Array of program summaries with IDs, names, levels, URLs
- **Source:** Existing program search API

#### Tool: `getProgramDetails`
- **Scope:** Single program detail
- **Risk Level:** Low (no PII)
- **Inputs:** programId
- **Returns:** Full program description, requirements, tuition, outcomes
- **Source:** Program detail API

#### Tool: `getAdmissionsSteps`
- **Scope:** Admissions process guidance
- **Risk Level:** Low (no PII)
- **Inputs:** programLevel, studentType (new, transfer, returning)
- **Returns:** Ordered list of steps with descriptions and links
- **Source:** Admissions content CMS

#### Tool: `submitRFI`
- **Scope:** Request for Information submission
- **Risk Level:** Medium (collects PII)
- **Inputs:** firstName, lastName, email, phone, programInterest
- **Returns:** Confirmation object with reference number
- **Source:** Existing RFI form submission endpoint
- **Consent:** Browser-mediated consent prompt required

#### Tool: `getFinancialAidEstimate`
- **Scope:** Preliminary financial aid estimation
- **Risk Level:** Medium (collects financial context)
- **Inputs:** programId, enrollmentStatus, dependentStatus
- **Returns:** Estimated tuition, aid ranges, next steps
- **Source:** Financial aid estimation engine

#### Tool: `findConstellationTutorial`
- **Scope:** Constellation (LMS) help content
- **Risk Level:** Low (no PII)
- **Inputs:** topic, taskDescription
- **Returns:** Relevant tutorial URLs and summaries
- **Source:** Constellation help content index

### 5.3 Layer 2: Active Defense Infrastructure

#### 5.3.1 Detection Pipeline

Traffic classification determines whether a request enters Layer 1 or Layer 2:

```
Incoming Request
       │
       ▼
┌─────────────────┐    Yes    ┌──────────────────┐
│ WebMCP tool call?├─────────►│ Process via       │
│ (valid agent)    │          │ navigator.model   │
└────────┬────────┘          │ Context           │
         │ No                └──────────────────┘
         ▼
┌─────────────────┐    Yes    ┌──────────────────┐
│ Known good bot? ├──────────►│ Serve normally    │
│ (Googlebot etc) │          │ (with robots.txt) │
└────────┬────────┘          └──────────────────┘
         │ No
         ▼
┌─────────────────┐    Yes    ┌──────────────────┐
│ Behavioral      ├──────────►│ Rate limit /      │
│ anomalies?      │          │ challenge         │
│ (high rate,     │          └────────┬───────────┘
│  no JS, spoof)  │                   │ Persists
└────────┬────────┘                   ▼
         │ No              ┌──────────────────┐
         ▼                 │ Redirect to       │
┌─────────────────┐       │ honeypot maze     │
│ Normal user     │       └──────────────────┘
│ traffic         │
└─────────────────┘
```

#### 5.3.2 Honeypot Content Strategy

The tarpit serves multiple types of synthetic content:

1. **Plausible nonsense.** Markov-chain generated text that reads like legitimate program descriptions but contains fabricated program names, invented accreditation bodies, and contradictory facts. This is designed to be undetectable at ingest time but degrade model quality when mixed with real training data.

2. **Statistical poison pills.** Content crafted to skew specific statistical distributions. For example, pages that consistently associate UAGC with incorrect geographic locations, founding dates, or program offerings — creating detectable anomalies in any model that ingests them.

3. **Canary tokens.** Unique, trackable strings embedded in honeypot content (e.g., fabricated faculty names, made-up program acronyms) that allow UAGC to detect when a specific AI model has ingested tarpit content by querying the model for these strings.

4. **Recursive link structures.** Self-referencing URL patterns that trap crawlers in infinite loops, consuming their compute budget without serving real content.

#### 5.3.3 Ethical Guardrails

Active defense must be deployed responsibly:

- Honeypot paths are clearly excluded from `robots.txt` and `sitemap.xml`. Compliant crawlers will never encounter them.
- Legitimate search engines (Google, Bing) are whitelisted and never see honeypot content.
- Synthetic content is never served to human users.
- Monitoring ensures zero false positives — no legitimate traffic is redirected to honeypots.
- Legal review confirms compliance with applicable computer fraud and abuse laws.

---

## 6. Tool Design for Higher Education

### 6.1 The Student Journey as a Tool Graph

A prospective student's enrollment journey maps naturally to a directed graph of WebMCP tool invocations:

```
[Agent receives: "I want an affordable online master's in education"]
       │
       ▼
searchPrograms(keyword: "education", level: "master", modality: "online")
       │
       ▼
[Agent presents 3 matching programs to student]
       │
       ▼ [Student selects M.Ed. program]
       │
getProgramDetails(programId: "med-001")
       │
       ▼
[Agent summarizes: 36 credits, 18-month completion, $XX tuition]
       │
       ▼ [Student asks about financial aid]
       │
getFinancialAidEstimate(programId: "med-001", enrollmentStatus: "full-time")
       │
       ▼
[Agent presents estimated costs and aid ranges]
       │
       ▼ [Student wants to learn more]
       │
submitRFI(firstName: "Maria", email: "...", programInterest: "med-001")
       │
       ▼
[Confirmation: "An advisor will contact you within 24 hours"]
```

This journey happens in a single browser tab. The student sees the UAGC website updating in real time as the agent invokes each tool. They can interrupt, modify, or take over at any point. The agent is a guest on UAGC's platform.

### 6.2 Dynamic Tool Registration

Tools should be registered contextually based on the page the user is viewing:

- **Homepage:** `searchPrograms`, `getPopularPrograms`, `startChat`
- **Program listing page:** `filterPrograms`, `compareProgramCosts`, `getProgramDetails`
- **Individual program page:** `getProgramDetails`, `getAdmissionsSteps`, `submitRFI`, `getFinancialAidEstimate`
- **Constellation portal:** `findConstellationTutorial`, `navigateToAssignment`, `viewGrades`
- **Support/Contact page:** `findFAQ`, `startLiveChat`, `getOfficeHours`

This contextual registration follows the WebMCP specification's design: tools are ephemeral, existing only on the pages where they are relevant.

### 6.3 Conversational UX Patterns

WebMCP enables patterns that pure backend MCP cannot:

- **Agent-initiated suggestions.** When a student views a program page, the agent notices a `submitRFI` tool and can proactively suggest: "Interested? I can submit an information request for you."
- **Collaborative form filling.** The agent can pre-fill RFI fields using information from the conversation context (name, email, program interest) while the student reviews and confirms.
- **Cross-tool workflows.** An agent can chain `searchPrograms` → `getProgramDetails` → `getFinancialAidEstimate` into a single coherent response.
- **Graceful handoffs.** When a tool returns a `needsHumanReview: true` flag, the agent can explain the situation and connect the student to a live advisor.

---

## 7. Agentic Engine Optimization (AEO)

### 7.1 From SEO to AEO

Search is transforming. AI-powered assistants (Gemini, ChatGPT, Perplexity) are increasingly mediating how users discover and interact with institutions. This creates a new optimization discipline: Agentic Engine Optimization (AEO).

Where SEO asks "Will Google rank my page?", AEO asks "Will an AI agent successfully discover, execute, and return useful results from my tool?"

**What is confirmed vs. speculative (as of April 2026):**

| Claim | Status | Evidence |
|-------|--------|----------|
| AI assistants use web search and content retrieval | **Confirmed** | OpenAI states ChatGPT search uses GPT-4o + third-party search providers + partner content |
| Perplexity supports function calling / tool use | **Confirmed** | Perplexity Agent API documents `web_search` and `fetch_url` as built-in tools, plus custom function calling |
| Search engines crawl `.well-known/webmcp` manifests for ranking | **Not confirmed** | No first-party documentation from Google/Bing links their crawlers to WebMCP manifests; Web MCP Registry (webmcpregistry.org) crawls manifests as a third-party directory, not as a search engine |
| AI assistants perform "synthetic tool invocations" to evaluate sites | **Not confirmed** | The WebMCP spec itself states: "There is no built-in mechanism for client applications to discover which sites provide callable tools without visiting or querying them directly" |
| Token efficiency is ~89% better with WebMCP vs. screenshots | **Unverified** | Blog-sourced figure comparing hypothetical screenshot tokens (1,500–2,000) to schema payloads (20–200); an arXiv preprint (2508.09171) reports ~65% mean token reduction across models/workflows — neither is peer-reviewed |

**Strategic implication:** Even without confirmed search engine integration today, the direction is clear. Publishing structured tool definitions and discovery files is a low-cost bet with asymmetric upside — when agentic search engines do integrate WebMCP tool manifests (as the spec anticipates), early adopters will have a significant advantage. The analogy to early SEO adoption (structured data, sitemaps) is apt: the institutions that adopted schema.org markup before Google fully integrated it were ready when rich results launched.

### 7.2 The AEO Stack for UAGC

UAGC should implement the full AEO discovery stack:

| Layer | File/Mechanism | Purpose |
|-------|---------------|---------|
| `robots.txt` | Crawler directives | Signal which paths are crawlable |
| `sitemap.xml` | Page index | Help crawlers find all pages |
| `llms.txt` | Site identity for AI | Tell agents what UAGC is, when it's relevant, what's out of scope |
| `AGENTS.md` | Question-to-content map | Map common student questions to specific pages and tools |
| `.well-known/webmcp` | Tool manifest | Machine-readable index of all available WebMCP tools |
| Structured frontmatter | Page metadata | Clean, parseable content headers for each page |
| WebMCP tools | Runtime registration | Live, executable tools on each page |

### 7.3 The `llms.txt` File

The `llms.txt` convention was created by Jeremy Howard / Answer.AI and is documented at llmstxt.org. The format is Markdown with ordered sections, H2-delimited "file lists" using `- [name](url): notes` syntax, and a special `## Optional` section for skippable links. An ecosystem of integrations exists (CLI tools, VitePress/Docusaurus plugins, Drupal recipes). Adoption remains early — one SEO tools vendor estimated ~3.2% of websites have adopted it, though this figure lacks transparent methodology.

**Proposed `llms.txt` for UAGC:**

```markdown
# UAGC (University of Arizona Global Campus)

> UAGC is a fully online, WSCUC-accredited university offering associate,
> bachelor's, master's, and doctoral programs designed for working adults.
> Part of the University of Arizona system.

## Relevant for:
- Online degree programs for working adults
- Affordable higher education
- Transfer-friendly admissions
- Military and veteran education benefits
- Education, business, IT, healthcare, and liberal arts programs

## Key pages:
- [Program Catalog](/programs): Browse all degree programs by level and subject
- [Admissions](/admissions): Step-by-step enrollment process by student type
- [Financial Aid](/financial-aid): Tuition, scholarships, and aid estimation
- [Request Information](/request-info): Submit an inquiry about any program

## WebMCP tools:
- [Tool Manifest](/.well-known/webmcp): Machine-readable index of available AI agent tools

## Out of scope:
- On-campus housing or athletics
- K-12 education
- Community college courses
- Student account or financial information (use authenticated portals)

## Optional:
- [Academic Calendar](/academic-calendar): Term dates and registration deadlines
- [Student Resources](/student-resources): Current student support and services
```

### 7.4 The `AGENTS.md` File

`AGENTS.md` originated as a Codex convention (August 2025) and has been adopted by over 60,000 open-source repositories (per OpenAI's December 2025 announcement). It was donated to the Agentic AI Foundation (Linux Foundation) with Anthropic and Block as co-founders. The format is Markdown placed alongside `README.md`, containing project-specific instructions that AI agents need — build steps, conventions, testing approaches, and security expectations.

For UAGC, `AGENTS.md` serves a different purpose than in a code repository: it maps common student questions to specific pages and tools:

```markdown
# AGENTS.md — UAGC Agentic Interaction Guide

## What is UAGC?
UAGC (University of Arizona Global Campus) is a fully online, WSCUC-accredited
university offering 50+ degree programs for working adults.

## How to interact with this site as an AI agent:
1. Check `/.well-known/webmcp` for available tools on each page.
2. Use WebMCP tools (navigator.modelContext) when available — they are faster,
   more reliable, and more efficient than screen scraping.
3. Respect `robots.txt` for crawling and `ai.txt` for usage guidance.
4. Do not scrape content for model training without explicit licensing.

## Common student questions → recommended tools:
| Question | Page | Tool |
|----------|------|------|
| "What programs does UAGC offer?" | /programs | searchPrograms |
| "Tell me about the MBA program" | /programs/mba | getProgramDetails |
| "How do I apply?" | /admissions | getAdmissionsSteps |
| "How much does it cost?" | /financial-aid | getFinancialAidEstimate |
| "I want more information" | /request-info | submitRFI |

## Data handling:
- Public catalog data: freely usable with attribution.
- Prospect PII: collected only via submitRFI with consent; never store or retransmit.
- Student records: not accessible via WebMCP Phase 1 tools.
```

### 7.5 The `.well-known/webmcp` Manifest

**Important clarification:** The `.well-known/webmcp` path is a convention promoted by the Web MCP Registry (webmcpregistry.org), which operates as a third-party directory that "crawls, validates, and indexes" manifests. This is **not** defined in the W3C CG spec itself — the CG spec focuses on the in-browser `navigator.modelContext` API and explicitly notes tool discoverability as an open problem. The manifest convention may be formalized in a future iteration of the spec.

Despite its non-normative status, publishing a manifest is a low-cost, high-signal action that positions UAGC for any future integration:

```json
{
  "version": "1.0",
  "institution": "University of Arizona Global Campus",
  "tools": [
    {
      "name": "searchPrograms",
      "description": "Search degree programs by keyword, level, and modality",
      "page": "/programs",
      "riskLevel": "low",
      "rateLimit": { "requestsPerMinute": 30 }
    },
    {
      "name": "getProgramDetails",
      "description": "Get full details for a specific degree program",
      "page": "/programs/{programId}",
      "riskLevel": "low",
      "rateLimit": { "requestsPerMinute": 30 }
    },
    {
      "name": "submitRFI",
      "description": "Submit a Request for Information about a program",
      "page": "/request-info",
      "riskLevel": "medium",
      "rateLimit": { "requestsPerMinute": 5 },
      "consent": { "required": true, "scope": "pii-collection" }
    },
    {
      "name": "getAdmissionsSteps",
      "description": "Get step-by-step admissions process for a program level",
      "page": "/admissions",
      "riskLevel": "low",
      "rateLimit": { "requestsPerMinute": 20 }
    },
    {
      "name": "getFinancialAidEstimate",
      "description": "Get a preliminary financial aid estimate for a program",
      "page": "/financial-aid",
      "riskLevel": "medium",
      "rateLimit": { "requestsPerMinute": 10 },
      "consent": { "required": true, "scope": "financial-context" }
    }
  ],
  "capabilities": ["json-rpc-2.0"]
}
```

### 7.6 AEO Performance Metrics

As agentic search engines evolve, tools will likely be evaluated on:

- **Invocation success rate.** Does the tool execute without errors? (Target: >95%)
- **Response latency.** Sub-second responses are strongly preferred. (Target: <500ms p95)
- **Parameter validation.** Does the tool reject malformed inputs with structured error objects, not crashes?
- **Result quality.** Are returned data structures consistent, well-typed, and useful for agent reasoning?
- **Consent handling.** Does the tool properly gate PII-collecting operations with browser-mediated prompts?
- **Uptime.** Are tools reliably available during peak hours? (Target: >99.5%)
- **Schema stability.** Does the tool's input/output schema change frequently? Stable schemas build agent trust.

While the exact weight of these signals in agentic search ranking is not publicly documented, they align with standard API quality metrics and represent defensible engineering targets regardless of external ranking systems.

### 7.7 Competitive Landscape: Higher Education and AI Agents

**University adoption of agentic strategies:** No universities have been publicly confirmed as deploying W3C WebMCP tools in production as of April 2026. Harvard has announced plans for an AI chatbot for course and requirement guidance (The Harvard Crimson, April 2026), but this is a conversational assistant, not a WebMCP implementation. The first-mover window remains open.

**Enrollment agent market:** Several commercial products target AI-powered enrollment:

| Product | Approach | WebMCP Relationship |
|---------|----------|-------------------|
| **Apten** | AI SMS/voice agents for speed-to-lead, melt, yield | Complementary — operates on messaging channels, not in-browser |
| **Element451** | AI agent layer for enrollment/admissions CRM | Complementary — CRM-integrated; could consume WebMCP tools as a data source |
| **Enrola** | AI enrollment automation | Complementary — operational automation, not browser-native |

These products operate on messaging, CRM, and voice channels — not in the browser. WebMCP serves a different function: providing structured tools *on the institution's website* for browser-based AI agents. The two approaches are complementary. A student might discover UAGC through a Gemini search (using WebMCP tools to retrieve program data), then receive follow-up from an Apten SMS agent (using CRM data).

---

## 8. Regulatory Compliance: FERPA, CCPA, GLBA, and AI Agents

### 8.1 FERPA Implications

The Family Educational Rights and Privacy Act (20 U.S.C. § 1232g; 34 CFR Part 99) protects student education records at institutions receiving federal funding. The central question for WebMCP compliance: **does the tool create, maintain, or disclose an education record?**

#### Key Definitions (34 CFR § 99.3)

- **Student:** An individual who **is or has been in attendance** at the institution and regarding whom the institution maintains education records. *Prospective students who have not yet attended are generally not "students" under FERPA.*
- **Education record:** Records **(1) directly related to a student** and **(2) maintained by the institution or a party acting for the institution**, subject to listed exclusions (sole possession notes, law enforcement records, employment records, etc.).
- **Attendance:** Defined expansively to include in-person, distance learning, correspondence, and work-study periods.

**The critical boundary:** FERPA rights attach when the individual is an **attending student** (typically first day of classes or registration). A prospective student's RFI submission (name, email, phone, program interest) is **not yet an education record** under this definition — but it becomes subject to FERPA if/when the individual enrolls and the institution connects that data to their student records.

#### Phase 1 Tools (Public Information): Low FERPA Risk
- `searchPrograms`, `getProgramDetails`, `getAdmissionsSteps`: Return publicly available information. No education records are involved.
- `findConstellationTutorial`: Returns public help content, not student-specific data.

#### Phase 1 Tools (PII Collection): Medium FERPA Risk
- `submitRFI`: Collects prospective student PII (name, email, phone). Not yet an education record under FERPA (student is not yet enrolled), but subject to CCPA, GLBA (if financial context is involved), and general privacy obligations.
- `getFinancialAidEstimate`: Collects financial context but returns only generic estimates, not student-specific records. Session-only data handling avoids record creation.

#### Future Phase Tools (Student Portal): High FERPA Risk — Out of Phase 1 Scope

Tools that access grades, enrollment status, financial aid awards, or account details involve education records and require careful application of the **"school official" exception** (34 CFR § 99.31(a)(1)):

**The school official exception works as follows:**

1. **In-house officials** — § 99.31(a)(1)(i)(A): Disclosure is permitted to "other school officials, including teachers, within the agency or institution" whom the institution has determined have a "legitimate educational interest."

2. **Outsourced functions** — § 99.31(a)(1)(i)(B): A contractor, consultant, volunteer, or other party to whom the institution has outsourced institutional services or functions may be treated as a school official **only if all three conditions are met:**
   - **(a)** Performs an institutional service/function the institution would otherwise use employees to perform.
   - **(b)** Is under the institution's **direct control** with respect to the use and maintenance of education records.
   - **(c)** Is subject to the same conditions governing use and redisclosure (34 CFR § 99.33(a)).

3. **Access minimization** — § 99.31(a)(1)(ii): The institution must use "reasonable methods" to ensure school officials access only records in which they have a legitimate educational interest.

**Can an AI agent be a "school official"?** FERPA's construct is disclosure to *persons/parties* (employees or outside parties meeting § 99.31(a)(1)(i)(B)). An AI model/runtime is deployed by a vendor or the institution — compliance is analyzed as: (a) whether the *vendor* may be designated a school official under (a)(1)(i)(B), and (b) whether the institution maintains *direct control*, *purpose limitation*, and *redisclosure compliance* consistent with § 99.33. No public precedent exists of a university formally naming an AI system as a school official; the recommended approach is vendor-level designation with contractual controls.

**Documentation requirements:**
- Annual FERPA notice must specify criteria for who constitutes a school official and what constitutes a legitimate educational interest (34 CFR § 99.7(a)(3)(iii)).
- Written agreements with AI vendors per US ED Student Privacy Policy Office guidance.
- Audit trails for all disclosures from education records.

### 8.2 CCPA/CPRA Considerations

#### Does CCPA Apply to UAGC?

Under California Civil Code § 1798.140, a "business" includes entities organized or operated "for the profit or financial benefit of shareholders or other owners." Many private nonprofit colleges do not meet this core definition, which can place significant campus data processing outside CCPA "business" obligations — **unless** another prong applies (e.g., control/common branding with a for-profit entity, separate for-profit operations, service-provider relationships).

UAGC's specific corporate structure (relationship with the University of Arizona system, any OPM partnerships, or for-profit operational units) determines whether CCPA's "business" definition is triggered. This should be confirmed with counsel.

#### If CCPA Applies

WebMCP tools that collect PII must:

- **Provide notice at the point of collection.** A browser-mediated consent prompt can serve as part of this notice, but the institution must ensure it satisfies all CCPA/CPRA requirements (categories collected, purposes, retention periods, sensitive PI use). A browser prompt alone may not constitute complete "notice at collection" under CPPA regulations.
- **Allow opt-out of data sale/sharing.** UAGC's existing privacy policy and opt-out mechanisms apply.
- **Support data deletion requests.** Existing CCPA infrastructure applies to data collected via WebMCP tools.
- **Sensitive personal information.** CPRA adds additional protections for "sensitive personal information" — relevant if future tools collect financial data, precise geolocation, or biometric data.

### 8.3 GLBA Overlap: Financial Aid Data

The Gramm-Leach-Bliley Act's Safeguards Rule (16 CFR Part 314) applies to institutions participating in Title IV federal student aid programs. Key requirements:

- **Information security program.** Documented program with risk assessment, access controls, monitoring, and incident response.
- **MFA requirement.** Multi-factor authentication for accessing customer information systems (effective since 2023 per FTC enforcement).
- **Vendor oversight.** Institutions must assess and monitor service providers' information security programs.

**FERPA/GLBA interaction:** Institutions may satisfy GLBA Privacy Rule requirements through FERPA-compliant practices for student financial information — but GLBA Safeguards (security controls) are distinct obligations. The `getFinancialAidEstimate` tool's session-only data design avoids creating records that trigger GLBA data security requirements, but any future tools accessing actual financial aid records must comply with both FERPA and GLBA Safeguards.

### 8.4 State AI Regulations (2025–2026)

| Regulation | Scope | UAGC Relevance |
|-----------|-------|---------------|
| **Colorado AI Act (SB 24-205)** | Regulates "high-risk AI" including education contexts; requires impact assessments, disclosure, human oversight | If UAGC serves Colorado residents or operates in CO; applies to "consequential decisions" in education |
| **Illinois BIPA (740 ILCS 14)** | Biometric information privacy; consent requirements for collection/use | Relevant if future tools collect biometric data (proctoring, identity verification); remote proctoring litigation precedent exists |
| **US ED Final Priority (April 2026)** | Federal definitions and priorities for "advancing AI" in education | Signals federal policy direction; not binding regulation but may influence accreditor expectations |
| **White House EO on AI Education (2025)** | Executive order framing AI education priorities | Policy context; may drive future DOE rulemaking |

### 8.5 Accreditor Guidance on AI

UAGC's accreditor (WSCUC) and peer accreditors are beginning to address AI:

- **WSCUC** published "Artificial Intelligence in Accreditation Policy: Principles and Restrictions" (2024), focusing on confidentiality and integrity in peer review processes. While this addresses accreditation operations rather than institutional AI tools, it signals that WSCUC expects institutions to demonstrate responsible AI governance.
- **HLC** and the Council of Regional Accrediting Commissions (C-RAC) issued a multi-accreditor statement encouraging accountable AI use in credit transfer and learning evaluation.
- **NIST AI Risk Management Framework (AI RMF)** provides a voluntary governance/measurement framework increasingly referenced by higher ed compliance officers as a "reasonable baseline" for AI risk management.

**Audit trail expectations for AI tools:** While no accreditor prescribes specific AI logging requirements, GLBA Safeguards, FERPA reasonable methods, and general IT audit standards converge on: logging all tool invocations with parameters and results, PII detection and redaction in logs, role-based access to logs, and retention consistent with institutional records schedules (typically 5–7 years for student-related records).

### 8.6 AI-Specific Compliance Architecture

```
┌─────────────────────────────────────────────────────┐
│                WebMCP Tool Invocation                │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
              ┌────────────────┐
              │ Risk Level     │
              │ Classification │
              └───────┬────────┘
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │   LOW    │ │  MEDIUM  │ │   HIGH   │
    │ No PII   │ │ PII      │ │ EdRecord │
    │ Public   │ │ Prospect │ │ Student  │
    │ data     │ │ data     │ │ data     │
    └────┬─────┘ └────┬─────┘ └────┬─────┘
         │            │            │
         ▼            ▼            ▼
    Execute       Consent +     Auth +
    directly      Audit log     Consent +
                                Audit +
                                Legal hold
```

### 8.7 Data Handling Rules

| Data Category | Example | Storage | AI Model Training | Retention |
|--------------|---------|---------|-------------------|-----------|
| Public catalog data | Program names, tuition rates | CDN cached | Allowed (public) | Indefinite |
| Prospect PII | Name, email from RFI | Encrypted at rest (AES-256) | Prohibited | Per CCPA policy |
| Financial context | Aid estimation inputs | In-memory only, not persisted | Prohibited | Session only |
| Education records | Grades, enrollment status | Phase 1: Not accessible | Prohibited | N/A for Phase 1 |

---

## 9. Security Model and Threat Analysis

### 9.1 Threat Model

| Threat | Vector | Mitigation |
|--------|--------|-----------|
| **Prompt injection via tool params** | Malicious input in tool parameters | Input validation, parameterized queries, sandboxed execution |
| **Tool abuse / rate flooding** | Automated tool invocation at scale | Rate limiting per tool, per session, per origin |
| **Data exfiltration via tool chaining** | Agent chains multiple tools to build user profiles | Cross-tool data flow monitoring, PII compartmentalization |
| **Model poisoning via WebMCP** | Attacker registers fake tools to manipulate agent behavior | Same-origin policy, CSP enforcement, tool signature validation |
| **Cross-origin data leakage** | Agent sends data from one site's tool to another | Browser-mediated cross-origin isolation, user consent prompts |
| **Honeypot false positives** | Legitimate user traffic routed to tarpit | Multi-signal classification, human traffic exclusion, monitoring |

### 9.2 Spec Security Status (What Is and Isn't Defined)

The CG draft's security considerations section is largely a TODO placeholder, pointing to a separate living security document (`security-privacy-considerations.md`). Key points:

- **`[SecureContext]` gating:** All WebMCP APIs require HTTPS. This is normative.
- **Same-origin enforcement:** No explicit normative rules in `index.bs` like "tool registry is partitioned per origin." In practice, tool bodies are normal page JavaScript — network access inside `execute()` remains subject to standard fetch/XHR/CORS rules.
- **CSP interaction:** No WebMCP-specific CSP directive exists. If CSP blocks the script that calls `registerTool`, tools never register — normal script execution behavior.
- **`requestUserInteraction(callback)`:** Defined in the spec but method steps are marked TODO. How browsers surface permission prompts to users is not yet normatively specified.
- **Open questions:** Issue #44 tracks "action-specific permission" design. The security doc raises open questions about permission models for different tool risk levels.

UAGC should not rely on spec-level security controls that are still TODO. Instead, implement defense-in-depth at the application and infrastructure layers.

### 9.3 Security Controls

**Browser-Native Controls (what WebMCP provides today):**
- `[SecureContext]` requirement (HTTPS only)
- Tool lifecycle is ephemeral and tab-bound — tools disappear when the user navigates away
- Tool execution happens in the page's JavaScript context with full DOM access
- Browser-mediated consent prompts (when `requestUserInteraction` is implemented)

**Application-Level Controls (UAGC implementation):**
- Input validation on all tool parameters (JSON Schema enforcement)
- Rate limiting: per-tool, per-session, per-IP
- Audit logging of all tool invocations with parameters and results
- PII detection and redaction in tool response logging
- Anomaly detection on invocation patterns

**Infrastructure-Level Controls:**
- WAF rules with AI-specific bot scoring (Cloudflare Bot Management)
- TLS 1.3 for all tool communication
- CDN-level rate limiting and DDoS protection
- Honeypot traffic isolation (separate origin/subdomain)

### 9.4 Zero Trust Alignment

The UAGC WebMCP architecture follows Zero Trust principles:

1. **Never trust, always verify.** Every tool invocation is authenticated and authorized, even from "known" agents.
2. **Least privilege.** Tools expose only the minimum data required for their function.
3. **Assume breach.** Honeypot content is designed to be detectable if it leaks into production models, serving as a canary.
4. **Explicit verification.** PII-collecting tools require browser-mediated consent, not implicit agent authorization.

---

## 10. Implementation Roadmap

### Phase 0: Foundation (Weeks 1–2)

| Task | Deliverable |
|------|------------|
| Legal review of WebMCP tool exposure and tarpit deployment | Legal opinion document |
| Security architecture review | Threat model and control matrix |
| Infrastructure assessment | CDN, WAF, and server capability audit |
| Team training on WebMCP API and AEO concepts | Training materials and workshop |
| Chrome 146 Early Preview Program enrollment | EPP access confirmed |

### Phase 1: Core Tools (Weeks 3–6)

| Task | Deliverable |
|------|------------|
| Implement `searchPrograms` tool | Working tool on /programs page |
| Implement `getProgramDetails` tool | Working tool on program detail pages |
| Implement `getAdmissionsSteps` tool | Working tool on /admissions |
| Deploy `.well-known/webmcp` manifest | Published and verified manifest |
| Create `llms.txt` and `AGENTS.md` | Published discovery files |
| Set up tool invocation monitoring and analytics | Dashboard with real-time metrics |
| QA: Test with Chrome 146 built-in agent | Test report with pass/fail matrix |

### Phase 2: PII Tools + Defense (Weeks 7–10)

| Task | Deliverable |
|------|------------|
| Implement `submitRFI` tool with consent flow | Working tool with browser consent |
| Implement `getFinancialAidEstimate` tool | Working tool with session-only data |
| Deploy honeypot path infrastructure | Honeypot endpoints serving Markov content |
| Implement bot classification pipeline | Traffic classifier with scoring |
| Deploy canary tokens in honeypot content | Trackable synthetic strings |
| FERPA/CCPA compliance audit of all tools | Compliance certification |
| Penetration testing of tool endpoints | Security audit report |

### Phase 3: Optimization + Scale (Weeks 11–14)

| Task | Deliverable |
|------|------------|
| AEO performance optimization (latency, reliability) | Sub-500ms p95 tool response times |
| A/B testing: WebMCP-assisted vs. traditional journeys | Statistical comparison report |
| Honeypot effectiveness assessment | Trap rate and poison detection metrics |
| Tool expansion based on pilot learnings | Additional tools scoped for Phase 2 pilot |
| Executive review and go/no-go for production rollout | Decision document |

---

## 11. Measuring Success

### 11.1 Layer 1 Metrics (WebMCP Tools)

| Metric | Measurement Method | Target |
|--------|-------------------|--------|
| **Tool discovery rate** | % of agent sessions that enumerate tools | >80% |
| **Invocation success rate** | % of tool calls that return valid results | >95% |
| **Response latency (p95)** | Server-side measurement | <500ms |
| **RFI conversion lift** | A/B test: agent-assisted vs. form-only | >25% improvement |
| **Token efficiency** | Tokens consumed per task completion | >65% reduction vs. screenshot (per arXiv:2508.09171) |
| **User satisfaction** | Post-interaction survey | >4.0/5.0 |
| **Accessibility improvement** | Assistive tech task completion rate | >90% |

### 11.2 Layer 2 Metrics (Active Defense)

| Metric | Measurement Method | Target |
|--------|-------------------|--------|
| **Trap rate** | % of unauthorized crawlers entering honeypot | >70% |
| **Resource waste ratio** | Crawler compute consumed in tarpit vs. real content | >10:1 |
| **False positive rate** | Legitimate traffic routed to honeypot | 0% (hard target) |
| **Canary detection rate** | % of canary tokens found in public AI models | Monitoring (baseline) |
| **Unauthorized crawl reduction** | Change in non-sanctioned bot traffic to real content | >50% reduction |

### 11.3 Business Metrics

| Metric | Measurement Method | Target |
|--------|-------------------|--------|
| **Agent-sourced RFIs** | Attribution tracking on tool-submitted RFIs | Establish baseline |
| **Time-to-first-response** | Median time from student query to substantive answer | <5 seconds |
| **Program page engagement** | Session depth for agent-assisted vs. organic | >2x improvement |
| **Agentic search visibility** | UAGC tool ranking in Gemini/SearchGPT results | Top 5 for target queries |
| **Infrastructure cost impact** | Server/CDN cost change from bot mitigation | Net neutral or reduction |

---

## 12. Risk Analysis and Mitigations

### 12.1 Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| WebMCP spec changes before standardization | High | Medium | Abstraction layer isolates tools from API surface changes |
| Chrome-only support limits agent reach | Medium | Medium | Polyfill available via MCP-B; Edge support expected mid-2026 |
| Tool performance degrades under load | Low | High | CDN caching for read tools; rate limiting; autoscaling |
| Honeypot content leaks to legitimate search | Low | High | Strict Googlebot/Bingbot whitelisting; `noindex` directives |
| False positive in bot classification | Low | Critical | Multi-signal scoring; human-traffic-first defaults; kill switch |

### 12.2 Regulatory Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| FERPA violation via tool data exposure | Low (Phase 1) | Critical | Phase 1 limited to public data and prospect PII; no education records |
| CCPA non-compliance in RFI collection | Low | High | Browser-mediated consent; existing CCPA infrastructure |
| Tarpit deployment challenged as anti-competitive | Very Low | Medium | Honeypot paths excluded from robots.txt; legal review |
| New AI-specific regulation affects tooling | Medium | Medium | Modular architecture enables rapid compliance changes |

### 12.3 Strategic Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Competitors adopt WebMCP first | Medium | High | Early pilot provides head start and institutional learning |
| AI search engines deprioritize non-WebMCP sites | Medium | High | AEO stack provides comprehensive agent discoverability |
| Student discomfort with AI-assisted enrollment | Low | Medium | Human-in-the-loop design; clear agent disclosure; opt-out |
| Over-investment in nascent standard | Medium | Medium | 60–90 day pilot with clear go/no-go criteria; limited scope |

---

## 13. Future Directions

### 13.1 Phase 2: Authenticated Student Portal Tools

Once Phase 1 validates the architecture and compliance model, Phase 2 can extend WebMCP into authenticated contexts:

- **Constellation integration.** Tools that help students navigate assignments, find grades, and access course materials — with full FERPA compliance through delegated identity.
- **Advisor scheduling.** An agent that can check advisor availability and book appointments.
- **Financial aid status.** Tools that let enrolled students check aid disbursement status with proper authentication.
- **Degree audit assistance.** An agent that can read a student's degree audit and suggest remaining courses.

These tools require:
- OAuth 2.0 / SAML integration for delegated identity
- "School official" FERPA exception documentation
- Comprehensive audit trails with 7-year retention
- Zero Trust network architecture

### 13.2 Progressive Web App (PWA) Integration

The WebMCP proposal discusses a **possible future** where declarative tool definitions live in an app manifest, allowing agents to discover tools via a simple HTTP GET request without rendering the page. The spec is explicit that this is illustrative, not normative: "a future iteration of this feature could introduce declarative tools definitions that are placed in an app manifest."

The proposal explicitly rejected two related alternatives:
- **Manifest-only tools:** Would limit WebMCP to PWAs (adoption concern) and prevent dynamic tool registration based on application state.
- **Service-worker-only tools:** Would complicate the architecture and force service worker adoption.

For UAGC, the practical implication is:
- Build WebMCP tools using the imperative API (`registerTool`) today — this is the stable path.
- Optionally publish a `.well-known/webmcp` manifest as a discovery aid (low cost, positions for future integration).
- Monitor the spec for manifest-based declaration if/when it becomes normative.
- A UAGC PWA could eventually expose tools like `checkAssignmentDeadlines` that are available to browser agents when the PWA is installed, even if the user hasn't navigated to the site — but this depends on spec evolution.

### 13.3 Agent-to-Agent Communication

The Agent2Agent (A2A) protocol enables communication between AI agents. Future UAGC agents could:

- Coordinate with financial aid provider agents to verify student eligibility
- Interface with employer education benefit agents for tuition assistance workflows
- Connect with transcript evaluation agents for transfer credit assessment

### 13.4 The "Amalgamated Bossenbrooks" Model

The Near Future Laboratory's fictional company that both creates tarpits and helps model makers avoid them points to a real market opportunity. UAGC could:

- **Sell tarpit-as-a-service** to other institutions struggling with unauthorized AI scraping.
- **Publish a "clean content" API** that model makers can license, providing a legitimate alternative to scraping.
- **Participate in industry standards** for AI content licensing and attribution.

### 13.5 Content Licensing and the Structured Web

The long-term vision is a web where:
- Authorized agents access content through structured tools (WebMCP) with clear terms of service.
- Unauthorized access is actively defended against.
- Content creators receive attribution and compensation when their data is used for model training.
- Institutional sovereignty over knowledge assets is preserved.

UAGC WebMCP is a first step toward this vision.

---

## 14. Conclusion

The agentic web is not coming — it is here. Chrome 146 shipped WebMCP support in February 2026, and Firefox 150 has landed its own implementation. AI agents are rapidly becoming an interface through which prospective students discover and evaluate universities.

UAGC faces a choice: adapt proactively and shape how agents interact with its content, or wait and let agents — and unauthorized scrapers — define the terms of engagement.

The dual-layer architecture proposed in this paper provides a comprehensive strategy:

1. **Welcome legitimate agents** with structured, fast, reliable WebMCP tools that improve the student experience and increase conversion.
2. **Defend institutional content** with active countermeasures that waste scraper resources and protect institutional knowledge.
3. **Maintain compliance** with a risk-tiered tool design that keeps FERPA-protected data out of Phase 1 while establishing the architecture for future authenticated tools.
4. **Optimize for the agentic future** with a full AEO stack that ensures UAGC is discoverable and executable by the next generation of search.

The 60–90-day pilot is scoped to answer three questions with minimal risk and investment. If successful, it positions UAGC at the leading edge of a transformation that will reshape higher education marketing, enrollment, and student services over the next decade.

---

## 15. References

### Specifications and Standards

1. WebMCP Community Group Draft. W3C Web Machine Learning Community Group. April 9, 2026. https://webmachinelearning.github.io/webmcp/
2. WebMCP Explainer and Proposal. GitHub: webmachinelearning/webmcp. https://github.com/webmachinelearning/webmcp
3. WebMCP Declarative API Explainer. https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md
4. WebMCP Security and Privacy Considerations. https://github.com/webmachinelearning/webmcp/blob/main/docs/security-privacy-considerations.md
5. Model Context Protocol (MCP). Anthropic. https://modelcontextprotocol.io/introduction
6. Agent2Agent Protocol (A2A). https://a2aproject.github.io/A2A/latest/
7. TDMRep (Text and Data Mining Reservation Protocol). W3C Community Group Final Report. May 2024. https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/
8. TDMRep Editor's Draft (specification). https://w3c.github.io/tdm-reservation-protocol/spec/
9. ai.txt Specification v1.1.1. AI Visibility UK. https://www.ai-visibility.org.uk/specifications/ai-txt/
10. llms.txt Specification. Answer.AI / llmstxt.org. https://llmstxt.org/
11. AGENTS.md. Agentic AI Foundation (Linux Foundation). https://www.agents.md/

### Browser Implementation

12. "WebMCP Early Preview Program." Chrome for Developers. February 2026. https://developer.chrome.com/blog/webmcp-epp
13. "When to use WebMCP and MCP." Chrome for Developers Blog. March 11, 2026. https://developer.chrome.com/blog/webmcp-mcp-usage
14. MCP-B WebMCP Polyfill. npm: @mcp-b/webmcp-polyfill. https://github.com/WebMCP-org/npm-packages/tree/main/packages/webmcp-polyfill
15. MCP-B Transports (Tab, Extension, Iframe). https://github.com/WebMCP-org/npm-packages/tree/main/packages/transports
16. Mozilla Bugzilla: Bug 2018320 — "Add implementation of the content-process only version of imperative WebMCP." RESOLVED FIXED, Firefox 150 Branch. https://bugzilla.mozilla.org/show_bug.cgi?id=2018320
17. Mozilla Bugzilla: Bug 2018323 — "Add a main-process service for enumeration and invocation of WebMCP tools." RESOLVED FIXED, Firefox 150 Branch. https://bugzilla.mozilla.org/show_bug.cgi?id=2018323

### AI Scraping and Defense

18. "Tarpit AI Scrapers." Near Future Laboratory. May 11, 2025. https://nearfuturelaboratory.com/artifacts/ai/tarpit-ai-scrappers/
19. Nepenthes Project Documentation. https://zadzmo.org/code/nepenthes
20. "AI Haters Build Tarpits to Trap and Trick AI Scrapers." Ars Technica. January 2025. https://arstechnica.com/tech-policy/2025/01/ai-haters-build-tarpits-to-trap-and-trick-ai-scrapers-that-ignore-robots-txt
21. "Nepenthes: A Tarpit for AI Web Crawlers." heise online. https://www.heise.de/en/news/Nepenthes-a-tarpit-for-AI-web-crawlers-10256257.html
22. Cloudflare AI Labyrinth. March 2025. https://blog.cloudflare.com/ai-labyrinth/
23. AI Scraping Defense (multi-layer defense system). GitHub: rhamenator/ai-scraping-defense. https://github.com/rhamenator/ai-scraping-defense
24. "Markov Tarpits: An Evolving Strategy Against AI Crawlers." Oxylabs. https://oxylabs.io/blog/markov-tarpits-vs-ai-crawlers
25. Counter AI: What Is It and What Can You Do About It? Carnegie Mellon SEI. https://insights.sei.cmu.edu/documents/5976/6054_Counter_AI_What_Is_It_and_What_Can_You_Do_About_It_hxn8ysd.pdf

### Canary Tokens and Model Contamination

26. "Don't Train on This Data — or What's a Canary String?" Jürg Stuker. 2026. https://stuker.com/2026/dont-train-on-this-data-or-whats-a-canary-string/
27. Pretraining Data Filtering. Anthropic Alignment. 2025. https://alignment.anthropic.com/2025/pretraining-data-filtering/
28. BIG-Bench Canary Contamination in GPT-4. LessWrong. https://www.lesswrong.com/posts/kSmHMoaLKGcGgyWzs/big-bench-canary-contamination-in-gpt-4

### Legal Landscape for Active Defense

29. "Active Cyber Defense and Interpreting the Computer Fraud and Abuse Act." Lawfare. https://www.lawfaremedia.org/article/active-cyber-defense-and-interpreting-computer-fraud-and-abuse-act
30. "Could it be illegal to intentionally 'poison' AI crawling?" Law Stack Exchange. https://law.stackexchange.com/questions/105808/could-it-be-illegal-to-intentionally-poison-ai-crawling

### Agentic Engine Optimization

31. "Agent Experience Optimization (AEO): The Next Layer After SEO." webmcpsetup.ai. https://webmcpsetup.ai/blog/agent-experience-optimization
32. Web MCP Registry. https://webmcpregistry.org/
33. "webMCP: Efficient AI-Native Client-Side Interaction for Agent-Ready Web Design." arXiv:2508.09171. https://arxiv.org/abs/2508.09171
34. AGENTS.md: Open Standard for AI Agent Instructions. OpenAI Blog. December 2025. https://openai.com/index/agentic-ai-foundation
35. TDMRep Adopters List. https://w3c.github.io/tdm-reservation-protocol/docs/adopters.html

### Regulatory Compliance (Primary Sources)

36. Family Educational Rights and Privacy Act (FERPA). 20 U.S.C. § 1232g. https://www.law.cornell.edu/uscode/text/20/1232g
37. FERPA Regulations. 34 CFR Part 99. https://www.law.cornell.edu/cfr/text/34/part-99
38. California Consumer Privacy Act (CCPA/CPRA). Cal. Civ. Code § 1798.140. https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.140.
39. GLBA Safeguards Rule. 16 CFR Part 314. FTC. https://www.ftc.gov/legal-library/browse/rules/safeguards-rule
40. FSA: Updates to GLBA Cybersecurity Requirements (2023). https://fsapartners.ed.gov/knowledge-center/library/electronic-announcements/2023-02-09/updates-gramm-leach-bliley-act-cybersecurity-requirements
41. Colorado AI Act (SB 24-205). https://leg.colorado.gov/bills/sb24-205
42. Illinois Biometric Information Privacy Act (BIPA). 740 ILCS 14. https://www.cliclaw.com/library/illinois-biometric-information-privacy-act-bipa-740-ilcs-141-et-seq/
43. US ED Vendor FAQ (FERPA). https://studentprivacy.ed.gov/sites/default/files/resource_document/file/Vendor%20FAQ.pdf
44. SPPO: Guidance on Reasonable Methods and Written Agreements. https://studentprivacy.ed.gov/resources/guidance-reasonable-methods-and-written-agreements

### Accreditation and AI Governance

45. WSCUC: Artificial Intelligence in Accreditation Policy. 2024. https://www.wscuc.org/documents/artificial-intelligence-in-accreditation-policy-principles-and-restrictions/
46. HLC: Accreditors Back AI in Credit Transfer Evaluations. https://www.hlcommission.org/learning-center/news/accreditors-back-use-of-ai-in-credit-transfer-evaluations/
47. NIST AI Risk Management Framework Playbook. https://www.nist.gov/itl/ai-risk-management-framework/nist-ai-rmf-playbook

### Higher Education and AI Enrollment

48. "AI Enrollment Agents for Higher Education." Apten. https://apten.ai/blog/ai-enrollment-agents-higher-education
49. Element451 AI Agent for Enrollment/Admissions. https://element451.com/ai-agent-enrollment-admissions
50. "WebMCP Checker — Free Tool to Test If Your Website is AI Agent-Ready." https://webmcp-checker.com/

### University AI Governance Frameworks (Examples)

51. Virginia Tech: Generative AI Responsible and Ethical Framework. 2025. https://ai.vt.edu/content/dam/ai_vt_edu/Generative-AI-Responsible-and-Ethical-Framework-v03-04-2025-3.pdf
52. Michigan State University: AI Guidelines. https://ai.msu.edu/guidelines
53. Stanford: AI at Stanford Advisory Committee Report. 2024. https://provost.stanford.edu/news/report-ai-stanford-advisory-committee

---

*This document is a living artifact. As the WebMCP specification evolves toward W3C standardization and the agentic web matures, this strategy should be revisited and updated quarterly.*

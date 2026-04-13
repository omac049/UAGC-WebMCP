# UAGC WebMCP: Technical and Legal Appendices

**Companion document to:** UAGC WebMCP White Paper v2.0  
**Date:** April 2026  
**Classification:** Strategic Research Document — Technical Reference

---

## Table of Contents

- [Appendix A: WebMCP API Surface and Spec Maturity](#appendix-a-webmcp-api-surface-and-spec-maturity)
- [Appendix B: Cross-Browser Support Matrix](#appendix-b-cross-browser-support-matrix)
- [Appendix C: Tarpit Ecosystem — Technical Architecture and Comparison](#appendix-c-tarpit-ecosystem--technical-architecture-and-comparison)
- [Appendix D: Legal and Regulatory Analysis](#appendix-d-legal-and-regulatory-analysis)
- [Appendix E: Advisory Directives — ai.txt and TDMRep](#appendix-e-advisory-directives--aitxt-and-tdmrep)
- [Appendix F: Canary Token Methodology](#appendix-f-canary-token-methodology)
- [Appendix G: Legal Landscape for Tarpit Deployment](#appendix-g-legal-landscape-for-tarpit-deployment)
- [References](#references)

---

## Appendix A: WebMCP API Surface and Spec Maturity

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

---

## Appendix B: Cross-Browser Support Matrix

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

---

## Appendix C: Tarpit Ecosystem — Technical Architecture and Comparison

### Nepenthes: Technical Architecture

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

### The Tarpit Ecosystem

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

---

## Appendix D: Legal and Regulatory Analysis

#### Key Definitions (34 CFR § 99.3)

- **Student:** An individual who **is or has been in attendance** at the institution and regarding whom the institution maintains education records. *Prospective students who have not yet attended are generally not "students" under FERPA.*
- **Education record:** Records **(1) directly related to a student** and **(2) maintained by the institution or a party acting for the institution**, subject to listed exclusions (sole possession notes, law enforcement records, employment records, etc.).
- **Attendance:** Defined expansively to include in-person, distance learning, correspondence, and work-study periods.

**The critical boundary:** FERPA rights attach when the individual is an **attending student** (typically first day of classes or registration). A prospective student's RFI submission (name, email, phone, program interest) is **not yet an education record** under this definition — but it becomes subject to FERPA if/when the individual enrolls and the institution connects that data to their student records.

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

---

## Appendix E: Advisory Directives — ai.txt and TDMRep

- **`ai.txt`** (AI Visibility UK, v1.1.1): A root-level `/ai.txt` plain text file with bracketed sections (`[identity]`, `[permissions]`, `[restrictions]` required; `[training]`, `[data-retention]` optional). Unlike `robots.txt` (which addresses *access* — "can you crawl?"), `ai.txt` addresses *usage* — "how should you cite, represent, and use what you access?" It is advisory with no enforcement mechanism.

- **TDMRep** (W3C Community Group Final Report, May 2024): Machine-readable signals for text-and-data-mining (TDM) rights reservation. Uses `/.well-known/tdmrep.json` with location patterns, plus HTTP headers and HTML metadata. Core signal: `tdm-reservation: 1` means rights are reserved; an optional `tdm-policy` URL points to a JSON-LD/JSON/HTML policy document. Adopted by major publishers (Elsevier, Springer Nature, IEEE, Sage, Cochrane); Finnish Publishers Association estimates 50–80% adoption among trade publishers and ~70% among learning materials publishers.

---

## Appendix F: Canary Token Methodology

**How canary tokens work in a tarpit context:**

1. **Embedding.** Fabricated faculty names, invented program acronyms, or unique phrase structures are seeded into Markov-generated honeypot content. Each token is logged with its creation timestamp and the honeypot path that served it.

2. **Detection.** UAGC periodically queries frontier models with prompts designed to elicit canary content (e.g., "Who is Dr. [fabricated name] at UAGC?" or "Tell me about the [invented acronym] program at UAGC"). A positive response indicates model contamination.

3. **Attribution.** Because canary tokens are unique per honeypot path and time window, a positive detection reveals approximately when and how the content was ingested.

**Known limitations:**
- Canary strings can be stripped during preprocessing if scraper operators actively filter for them.
- Effectiveness assumes some pipeline transparency — compliance is voluntary.
- Community forensics have documented contamination in multiple frontier models using BIG-bench canary strings (LessWrong reports for GPT-4, Gemini 3 Pro, Claude Opus 4.5), suggesting current training pipelines do not universally filter canary-marked content.

**UAGC implementation:** Embed 50–100 unique canary strings per quarter across honeypot paths. Maintain a private registry mapping each string to its deployment context. Run detection queries monthly against major AI models. Log all results for potential DMCA or content licensing discussions.

---

## Appendix G: Legal Landscape for Tarpit Deployment

**Computer Fraud and Abuse Act (18 U.S.C. § 1030):** The CFAA targets "unauthorized access" to computers. A tarpit deploys on *the institution's own server*, serving content to visitors who access the institution's URLs. Lawfare analysis of active cyber defense distinguishes this from scenarios where a defender accesses an attacker's machine — a tarpit does not reach into the scraper's infrastructure. The potential flashpoint is § 1030(a)(5)(A) ("transmission… causing damage"), but this appears to require access to the target system, which a tarpit does not perform.

**UK Computer Misuse Act:** Law Stack Exchange analysis concludes that CMA offenses hinge on "unauthorised access" to computers you do not own; operating your own server to serve unhelpful content to unwanted visitors is compared to DNS sinkholes and network tarpits — "not obviously illegal" but without case law to confirm.

**Contractual / TOS framing:** If UAGC's Terms of Service prohibit automated scraping (as most university TOS do), unauthorized crawlers are accessing the site in violation of those terms. The tarpit serves content only to visitors who have already violated TOS — strengthening the institution's position.

**Conservative implementation for UAGC:**
- Honeypot paths are explicitly excluded from `robots.txt` and `sitemap.xml`. Compliant crawlers will never encounter them.
- No executable code or malware is served — only text content.
- Legitimate search engines are whitelisted.
- Legal review confirms compliance before deployment.
- All tarpit interactions are logged for forensic review.

---

## References

### Specifications and Standards

1. WebMCP Community Group Draft. W3C Web Machine Learning Community Group. April 9, 2026. https://webmachinelearning.github.io/webmcp/
2. WebMCP Explainer and Proposal. GitHub: webmachinelearning/webmcp. https://github.com/webmachinelearning/webmcp
3. WebMCP Declarative API Explainer. https://github.com/webmachinelearning/webmcp/blob/main/declarative-api-explainer.md
7. TDMRep (Text and Data Mining Reservation Protocol). W3C Community Group Final Report. May 2024. https://www.w3.org/community/reports/tdmrep/CG-FINAL-tdmrep-20240510/
9. ai.txt Specification v1.1.1. AI Visibility UK. https://www.ai-visibility.org.uk/specifications/ai-txt/

### Browser Implementation

12. "WebMCP Early Preview Program." Chrome for Developers. February 2026. https://developer.chrome.com/blog/webmcp-epp
14. MCP-B WebMCP Polyfill. npm: @mcp-b/webmcp-polyfill. https://github.com/WebMCP-org/npm-packages/tree/main/packages/webmcp-polyfill
15. MCP-B Transports (Tab, Extension, Iframe). https://github.com/WebMCP-org/npm-packages/tree/main/packages/transports
16. Mozilla Bugzilla: Bug 2018320 — "Add implementation of the content-process only version of imperative WebMCP." RESOLVED FIXED, Firefox 150 Branch. https://bugzilla.mozilla.org/show_bug.cgi?id=2018320
17. Mozilla Bugzilla: Bug 2018323 — "Add a main-process service for enumeration and invocation of WebMCP tools." RESOLVED FIXED, Firefox 150 Branch. https://bugzilla.mozilla.org/show_bug.cgi?id=2018323

### AI Scraping and Defense

19. Nepenthes Project Documentation. https://zadzmo.org/code/nepenthes
22. Cloudflare AI Labyrinth. March 2025. https://blog.cloudflare.com/ai-labyrinth/
23. AI Scraping Defense (multi-layer defense system). GitHub: rhamenator/ai-scraping-defense. https://github.com/rhamenator/ai-scraping-defense

### Canary Tokens and Model Contamination

26. "Don't Train on This Data — or What's a Canary String?" Jürg Stuker. 2026. https://stuker.com/2026/dont-train-on-this-data-or-whats-a-canary-string/
27. Pretraining Data Filtering. Anthropic Alignment. 2025. https://alignment.anthropic.com/2025/pretraining-data-filtering/
28. BIG-Bench Canary Contamination in GPT-4. LessWrong. https://www.lesswrong.com/posts/kSmHMoaLKGcGgyWzs/big-bench-canary-contamination-in-gpt-4

### Legal Landscape for Active Defense

29. "Active Cyber Defense and Interpreting the Computer Fraud and Abuse Act." Lawfare. https://www.lawfaremedia.org/article/active-cyber-defense-and-interpreting-computer-fraud-and-abuse-act
30. "Could it be illegal to intentionally 'poison' AI crawling?" Law Stack Exchange. https://law.stackexchange.com/questions/105808/could-it-be-illegal-to-intentionally-poison-ai-crawling

### Agentic Engine Optimization

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

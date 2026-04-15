# UAGC WebMCP: Executive Brief

**Controlled AI Agent Access and Active Scraping Defense**  
Version 2.1 · April 2026

---

## The Opportunity

AI-assisted browsing and agent-mediated discovery are emerging as strategically important channels through which prospective students research institutions. Universities that publish structured, machine-readable pathways for legitimate agents improve how their programs are found, compared, and acted upon in agentic workflows. Those that rely only on conventional page-centric discovery may see gradual visibility pressure as agentic search supplements—and in some segments displaces—traditional search behavior. A measured pilot now allows UAGC to establish structured access and governance patterns while browser support, vendor behavior, and regulatory guidance continue to evolve.

## The Dual-Layer Strategy

UAGC WebMCP pairs invitation with deterrence. **Layer 1** exposes public enrollment journeys as browser-native tools aligned with the W3C Web Model Context Protocol (WebMCP): program search, admissions steps, and RFI submission, executed with explicit contracts rather than ad hoc screen scraping. **Layer 2** routes suspected unauthorized crawlers into honeypot and tarpit infrastructure that wastes scraper resources and limits high-value extraction, while compliant indexing and human traffic follow normal paths. Layer 2 is isolated from production content URLs and governed by whitelists, monitoring, and legal review described in the full paper. The operating principle is straightforward: *invited guests* receive sanctioned tools; *uninvited scrapers* are denied a productive harvest.

## The Precedent: Amazon v. Perplexity (March 2026)

In March 2026, a U.S. federal judge granted Amazon a temporary injunction blocking Perplexity's "Comet" AI browser from scraping its site, finding **"strong evidence"** of unauthorized access and **"essentially undisputed evidence"** of harm ([CNBC, March 10, 2026](https://www.cnbc.com/2026/03/10/amazon-wins-court-order-to-block-perplexitys-ai-shopping-agent.html)). The case exposes how unauthorized AI agents disrupt entire platform ecosystems — not just content extraction, but advertising revenue, customer data security, and brand experience control.

**The higher-education parallel is direct.** Without structured agent pathways, UAGC faces the same category of risks:

- **Discovery intermediation:** Unauthorized agents could surface UAGC program data on third-party platforms, bypassing enrollment funnels and attribution tracking.
- **Intent data leakage:** Prospective student search patterns become the agent provider's data asset rather than UAGC's own marketing intelligence.
- **Revenue model disruption:** Just as Amazon's advertising contracts were jeopardized when agents bypassed product pages, UAGC's speed-to-lead advantage erodes when agents mediate the first interaction outside institutional control.

Amazon responded reactively — blocking dozens of agents, building an in-house alternative, and filing a federal lawsuit after the damage was done. The dual-layer architecture proposed here allows UAGC to **act proactively**: build the authorized channel and the defense layer simultaneously, before the reactive cycle begins.

## Why UAGC

- **Enrollment context:** Projections indicate a 13–15% decline in high school graduates through 2037; speed-to-lead remains strategically important, with roughly 78% of students enrolling with the first institution that responds.
- **Reuse of existing assets:** Program catalogs, admissions checklists, and financial aid calculators already exist; WebMCP surfaces them as structured tools instead of funding parallel content pipelines.
- **Human-in-the-loop fit:** Students do not fully delegate enrollment; WebMCP's tab-bound model keeps the agent and the student in the same browser session, preserving transparency, consent paths, and institutional UX control.
- **Judicial clarity:** The Amazon v. Perplexity ruling confirms that platforms have legal standing to block unauthorized AI agents and that unauthorized access creates cognizable harm — strengthening the rationale for both the invitation layer and the defense layer.
- **Measured first-mover window:** As of April 2026, no university has been publicly confirmed deploying W3C WebMCP tools in production, which creates a finite opportunity for disciplined, low-regret experimentation.

## Pilot Scope

| Element | Phase 1 |
|--------|---------|
| **Duration** | 60–90 days |
| **Surface** | Public-facing tools only: program search, admissions steps, RFI |
| **Data boundary** | No student education records; no FERPA-protected datasets in Phase 1 |
| **Targets** | >60% agent journey completion (multi-step task); >95% tool reliability; >70% unauthorized crawler trap rate; **zero** compliance incidents |

## The Ask

We recommend leadership approve a 60–90 day pilot of the UAGC WebMCP dual-layer architecture, limited to public-facing tools with no access to student records or FERPA-protected data. Phase 1 requires [minimal incremental investment] against existing web, CDN, and governance infrastructure, with legal and security review completed before active-defense routing goes live. A go/no-go decision point at Week 10 provides a clear exit ramp if metrics underperform.

## Supporting Materials

Decision-grade depth, technical specifications, threat modeling, regulatory analysis (FERPA/CCPA/GLBA and related frameworks), the Amazon v. Perplexity case study, and the full reference list are contained in **UAGC_WebMCP_WhitePaper.md** (Version 2.2, April 2026). Technical and legal appendices distributed with that white paper should be treated as companion sources for implementation teams and counsel.

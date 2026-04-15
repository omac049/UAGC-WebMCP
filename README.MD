# UAGC WebMCP Pilot — Strategy & Presentation

**Purpose:** Strategic blueprint for UAGC's WebMCP pilot — exploring how agent-native interactions can streamline public-site support journeys while maintaining privacy, security, and regulatory compliance.

## Documents

| Document | Description |
|----------|-------------|
| [White Paper](./UAGC_WebMCP_WhitePaper.md) | Full research paper v2.0 (~10,900 words, 53 references): *UAGC WebMCP: Building a Dual-Layer Agentic Web Strategy* — covers WebMCP API dictionary, browser support matrix, tarpit ecosystem comparison, canary token methodology, legal landscape, FERPA/CCPA/GLBA compliance, AEO analysis, competitive landscape, and implementation roadmap |
| [Executive Brief](./UAGC_WebMCP_ExecutiveBrief.md) | Condensed strategy overview for leadership |
| [Technical Appendices](./UAGC_WebMCP_Appendices.md) | Detailed technical specifications and reference material |
| [HTML Presentation](./index.html) | **Agentflow** layout: left-to-right invited vs. defense paths, three-line story, pilot KPIs — for exec teams |
| [Document Viewer](./docs.html) | Interactive document viewer for all strategy papers |

## Core Concept

UAGC WebMCP proposes a **dual-layer architecture**:

1. **Layer 1 — Invited Guest (WebMCP):** Expose university services as structured, browser-native tools via `navigator.modelContext`. Legitimate AI agents get fast, reliable, consent-gated access to program search, admissions guidance, RFI submission, and more.

2. **Layer 2 — Active Defense (Tarpit/Honeypot):** Unauthorized AI scrapers that bypass `robots.txt` and ignore WebMCP tool contracts are redirected into honeypot infrastructure serving Markov-chain nonsense, wasting crawler resources and poisoning training data.

## Pilot Scope (60–90 days)

- **In scope:** Public-facing support flows (program search, admissions, RFI, financial aid estimates, Constellation tutorials)
- **Out of scope:** Student portal access, account changes, financial transactions (requires FERPA-compliant delegated identity)

## Key Questions

1. Does WebMCP materially improve user experience and conversion metrics for public-site tasks?
2. Can UAGC safely expose tools without compromising student privacy or violating FERPA/CCPA?
3. What operational overhead and infrastructure changes are required to run WebMCP at scale?

## Quick Links

- [WebMCP W3C Spec](https://webmachinelearning.github.io/webmcp/)
- [WebMCP GitHub](https://github.com/webmachinelearning/webmcp)
- [Chrome WebMCP Blog](https://developer.chrome.com/blog/webmcp-mcp-usage)
- [Near Future Laboratory — Tarpit AI Scrapers](https://nearfuturelaboratory.com/artifacts/ai/tarpit-ai-scrappers/)
- [Nepenthes (AI crawler tarpit)](https://zadzmo.org/code/nepenthes)
- [Cloudflare AI Labyrinth](https://blog.cloudflare.com/ai-labyrinth/)
- [TDMRep (W3C)](https://w3c.github.io/tdm-reservation-protocol/spec/)
- [AGENTS.md (Agentic AI Foundation)](https://www.agents.md/)

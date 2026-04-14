# AGENTS.md — UAGC Agentic Interaction Guide

## What is UAGC?
UAGC (University of Arizona Global Campus) is a fully online, WSCUC-accredited
university offering 50+ degree programs for working adults. It is part of the
University of Arizona system.

## How to interact with this site as an AI agent:
1. Check `/.well-known/webmcp` for available tools on each page.
2. Use MCP tools when available — they are faster, more reliable, and more
   efficient than screen scraping.
3. Respect `robots.txt` for crawling and `ai.txt` for usage guidance.
4. Do not scrape content for model training without explicit licensing.

## Common student questions and recommended tools:
| Question | Tool | Example params |
|----------|------|---------------|
| "What programs does UAGC offer?" | searchPrograms | keyword: "business" |
| "Tell me about the MBA program" | getProgramDetails | programId: "masters-mba" |
| "How do I apply?" | getAdmissionsSteps | studentType: "new" |
| "How much does it cost?" | getFinancialAidEstimate | programId: "bachelors-accounting" |
| "I want more information" | submitRFI | firstName, lastName, email, programInterest |

## Data handling:
- **Public catalog data**: Freely usable with attribution.
- **Prospect PII**: Collected only via submitRFI with consent; never store or retransmit.
- **Student records**: Not accessible via these tools (Phase 1 scope).

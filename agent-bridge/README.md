# UAGC Agent Bridge MCP Server

## Overview

A remote MCP server that gives AI agents structured access to UAGC program catalog, admissions, and financial aid information. It scrapes the live uagc.edu site, stores the results as structured JSON, and exposes that data through MCP tools over SSE that ChatGPT, Claude, Cursor, and other agents can invoke.

## Quick Start

```bash
cd agent-bridge
pip install -r requirements.txt
python scraper.py        # scrape uagc.edu → cache/ (2-5 minutes)
python server.py         # start MCP server on :8000
```

## Connect to ChatGPT

The server exposes an SSE endpoint at `http://localhost:8000/sse/`. To connect from ChatGPT:

1. **ChatGPT UI**: Open **Settings > Apps & Connectors**, add your server's public URL (e.g. `https://your-host.example.com/sse/`). For local testing, use ngrok or Cloudflare Tunnel to get a public URL.
2. **Via API**: Use the `"type": "mcp"` tool configuration in the Responses API:

```bash
curl https://api.openai.com/v1/responses \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4o",
    "tools": [{
      "type": "mcp",
      "server_label": "uagc",
      "server_url": "https://your-host.example.com/sse/",
      "require_approval": "never"
    }],
    "input": "What MBA programs does UAGC offer?"
  }'
```

## Connect to Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "uagc-agent-bridge": {
      "url": "http://localhost:8000/sse/"
    }
  }
}
```

## Connect to Cursor

Add to Cursor's MCP settings (`.cursor/mcp.json`):

```json
{
  "mcpServers": {
    "uagc-agent-bridge": {
      "url": "http://localhost:8000/sse/"
    }
  }
}
```

## Tools Available

| Name | Description | Risk Level |
|------|-------------|------------|
| `searchPrograms` | Search the program catalog by keyword, degree level, and area of interest | low |
| `getProgramDetails` | Full program details: description, requirements, outcomes, and cost | low |
| `getAdmissionsSteps` | Step-by-step admissions process by student type | low |
| `getFinancialAidEstimate` | Tuition, financial aid ranges, and scholarships for a program | medium |
| `submitRFI` | Submit a Request for Information about a program (bridge mode: logged only) | medium |

## Architecture

```
ChatGPT / Claude / Cursor
        |
        | (MCP over SSE)
        v
  Agent Bridge MCP Server (server.py)
        |
        | reads from
        v
  Structured Cache (cache/*.json)
        ^
        | populated by
        |
  Scraper (scraper.py)
        |
        | fetches from
        v
  Live uagc.edu
```

The server follows a scrape-cache-serve pattern: `scraper.py` fetches and normalizes public pages from uagc.edu into JSON files; `server.py` reads that cache and maps each MCP tool to the corresponding structured payload.

## Re-scraping

Run `python scraper.py` anytime to refresh the cache from the live site. Use `--limit N` to scrape only the first N program detail pages (useful for testing).

## AEO Discovery Files

The `aeo/` directory contains agent discovery files that would be deployed alongside the tools:

- `webmcp.json` — `.well-known/webmcp` manifest
- `llms.txt` — LLM site identity file
- `agents.md` — Agent interaction guide

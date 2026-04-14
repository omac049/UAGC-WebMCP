#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/../.env" 2>/dev/null || true

MCP_URL="${1:-https://stretch-financial-nat-bird.trycloudflare.com/mcp/}"

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "ERROR: OPENAI_API_KEY not set. Create .env in the repo root or export it."
  exit 1
fi

TOTAL_TOOLS=0
TOTAL_TOKENS=0

run_scenario() {
  local num="$1" title="$2" prompt="$3"
  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "  SCENARIO $num: $title"
  echo "══════════════════════════════════════════════════════════════"
  echo ""
  echo "PROMPT: \"$prompt\""
  echo ""

  local payload
  payload=$(python3 -c "
import json
print(json.dumps({
  'model': 'gpt-4o',
  'tools': [{'type':'mcp','server_label':'uagc','server_url':'$MCP_URL','require_approval':'never'}],
  'input': '$prompt'
}))
")

  local response
  response=$(curl -s -m 120 https://api.openai.com/v1/responses \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload")

  python3 << 'PYEOF'
import json, sys, os

raw = r"""RESPONSE_JSON"""
resp = json.loads(os.environ.get("DEMO_RESP", "{}"))
tools = 0
tokens = 0
for item in resp.get("output", []):
    if item["type"] == "mcp_call":
        tools += 1
        args = item.get("arguments", "")
        if len(args) > 120:
            args = args[:120] + "..."
        print(f"  TOOL: {item['name']}({args})")
    elif item["type"] == "message":
        print()
        for c in item.get("content", []):
            print(c.get("text", ""))
tokens = resp.get("usage", {}).get("total_tokens", 0)
print(f"\n  [{tools} tool calls | {tokens:,} tokens]")
with open("/tmp/demo_tools", "a") as f:
    f.write(f"{tools}\n")
with open("/tmp/demo_tokens", "a") as f:
    f.write(f"{tokens}\n")
PYEOF
}

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         UAGC AGENT BRIDGE — DEMO                           ║"
echo "║         GPT-4o + MCP Tools against live uagc.edu data      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "MCP Server: $MCP_URL"
echo "Model: gpt-4o"

rm -f /tmp/demo_tools /tmp/demo_tokens

SCENARIOS=(
  "1|Program Discovery|I am a working parent looking for an affordable online bachelors degree in business. What does UAGC offer?"
  "2|Program Deep Dive|Tell me more about the Bachelor of Business Administration at UAGC. What will I learn and what are the career outcomes?"
  "3|How to Apply|How do I apply to UAGC as a new student? Walk me through the steps."
  "4|Financial Planning|What financial aid and scholarships does UAGC offer for the BA in Business Administration?"
  "5|Full Student Journey|I am a military veteran interested in an online masters in education. What programs does UAGC have, how do I apply, and what financial aid is available for veterans?"
)

for scenario in "${SCENARIOS[@]}"; do
  IFS='|' read -r num title prompt <<< "$scenario"

  echo ""
  echo "══════════════════════════════════════════════════════════════"
  echo "  SCENARIO $num: $title"
  echo "══════════════════════════════════════════════════════════════"
  echo ""
  echo "PROMPT: \"$prompt\""
  echo ""

  payload=$(python3 -c "
import json
print(json.dumps({
  'model': 'gpt-4o',
  'tools': [{'type':'mcp','server_label':'uagc','server_url':'$MCP_URL','require_approval':'never'}],
  'input': '$prompt'
}))
")

  response=$(curl -s -m 120 https://api.openai.com/v1/responses \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$payload")

  DEMO_RESP="$response" python3 << 'PYEOF'
import json, os
resp = json.loads(os.environ["DEMO_RESP"])
tools = 0
tokens = resp.get("usage", {}).get("total_tokens", 0)
for item in resp.get("output", []):
    if item["type"] == "mcp_call":
        tools += 1
        args = item.get("arguments", "")
        if len(args) > 120:
            args = args[:120] + "..."
        print(f"  TOOL: {item['name']}({args})")
    elif item["type"] == "message":
        print()
        for c in item.get("content", []):
            print(c.get("text", ""))
print(f"\n  [{tools} tool calls | {tokens:,} tokens]")
with open("/tmp/demo_tools", "a") as f:
    f.write(f"{tools}\n")
with open("/tmp/demo_tokens", "a") as f:
    f.write(f"{tokens}\n")
PYEOF

done

echo ""
echo "══════════════════════════════════════════════════════════════"
echo "  SUMMARY"
echo "══════════════════════════════════════════════════════════════"
python3 << 'PYEOF'
tools = sum(int(x) for x in open("/tmp/demo_tools").read().strip().split("\n") if x)
tokens = sum(int(x) for x in open("/tmp/demo_tokens").read().strip().split("\n") if x)
print(f"  Scenarios run:    5")
print(f"  Total tool calls: {tools}")
print(f"  Total tokens:     {tokens:,}")
print(f"  Avg per scenario: {tokens // 5:,}")
PYEOF
echo "══════════════════════════════════════════════════════════════"
echo ""

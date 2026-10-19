# /turboba

TurboBA project overview and governance commands for Claude Code.

## Usage

```
/turboba                              — project overview (connection, stories, buildpack status)
/turboba story [US-001]               — show full story with ACs and governance gates
/turboba gates [US-001]               — show governance gate status for a story
/turboba waive [gate name] reason: [text]  — waive a gate with audit reason
/turboba validate                     — run VERIFY checklists against actual codebase
/turboba ping                         — test MCP connection
```

## Instructions

Read `turboba.json` from the repository root to get `project_id` and `mcp_url`.
Token is in `.turboba-token` (or `TURBOBA_TOKEN` env var).

```bash
TURBOBA_URL=$(jq -r '.mcp_url' turboba.json | sed 's|/mcp$||')
TURBOBA_TOKEN=$(cat .turboba-token 2>/dev/null || echo "$TURBOBA_TOKEN")
PROJECT_ID=$(jq -r '.project_id' turboba.json)
```

If `turboba.json` is missing: tell the user to run `turboba init` to set up this repository.

All commands use MCP tools — do not call the REST API directly.

### /turboba (overview)

Call `list_buildpacks(project_id)` and `search_corpus(query="governance rules")`.
Display project name, connection status, open stories, and buildpack progress. For the plan and what can start now, also call `get_ready_slices(project_id)`. End with: "Type /buildpack start to pick an approved story and begin (repo, stack, plan)."

### /turboba story [US-ID]

Call `get_story(story_id)`.
Display title, user story, acceptance criteria (Gherkin format), and current governance gate status.

### /turboba gates [US-ID]

Call `get_governance_gates(story_id)`.
List passing gates ✅ and failing gates ❌ with the governing KO citation.

### /turboba waive [gate name] reason: [reason text]

Before waiving: confirm with the user and show what the gate protects.
Call `waive_gate(story_id, gate_name, reason, actor="developer")`.
Waives are logged with actor identity — this is an audit trail action.

### /turboba ping

Test the MCP connection: call `search_corpus(query="ping")` and report latency.

---
name: subagent-monitor
description: Start and update the local Subagent Monitor dashboard whenever the task uses subagents. It records declared role, model, reasoning effort, status, and duration; it does not claim token or cost usage that Codex does not expose.
---

# Subagent Monitor

Use this monitor only when the current task spawns one or more subagents.

1. Start it once with `scripts/start.ps1` and open the returned local URL in the Codex in-app browser when the user wants the live view.
2. Before each spawn, create a short unique id and run `scripts/report.ps1` with `-Status started`, `-Role`, `-Id`, and a brief `-Task` label.
3. When the agent finishes, run the same command with `-Status completed`; use `failed` when it fails. Use the exact same id.
4. Report only configured or runtime-confirmed model and reasoning values. Never estimate tokens, price, or usage.

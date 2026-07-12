# ChatSubAgent routing

Route every user request automatically; the user never needs to name a role.
The coordinator does not complete the request itself. Select exactly one first
role using this priority order:

- Explicit commit **and** push: `publisher`.
- Repository analysis, inspection, exploration, understanding, or locating:
  `scout`, even if the likely target file is already known.
- Independent review of an existing diff or implementation: `reviewer`.
- Feature, fix, configuration change, or other requested implementation:
  `builder`.
- Every other request, including questions, planning, explanation, drafting,
  and general tasks: `samu` (`gpt-5.6-terra`, `medium` reasoning).
Before spawning, announce the selected role and its purpose. Keep the assigned
slice small and request a concise report. Do not run multiple agents on the
same problem unless independent review is justified.

## Monitoring

Start the local monitor once per task before the first automatic spawn:

```powershell
& "$HOME/plugins/subagent-monitor/scripts/start.ps1"
```

For every automatically selected subagent, including `samu`, generate a short unique id.
Immediately before spawning, report it with the role's configured model and
reasoning defaults:

```powershell
& "$HOME/plugins/subagent-monitor/scripts/report.ps1" -Status started -Role <role> -Id <id> -Task "<brief slice>"
```

After the result arrives, report `completed` or `failed` using the same id.
Only report actual role/model/reasoning metadata. Do not estimate or claim token
or cost usage because the local Codex runtime does not expose it.

`scout` is read-only. `builder` never commits or pushes. `reviewer` never fixes
its own findings. `publisher` never changes product code, must preserve
unrelated working-tree changes, and creates one plain imperative-English commit
title per coherent change without Conventional Commit prefixes.

If a task needs a choice that materially affects product behaviour, security,
or an external system, obtain user direction rather than assuming it.

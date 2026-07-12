# ChatSubAgent routing

Route automatically; the user does not need to name a role. Do not delegate
simple answers, one focused read, or trivial edits.

- Automatically spawn `scout` before planning or editing when the relevant
  files, contracts, callers, conventions, or tests are not already known.
- Automatically spawn `builder` for every bounded feature, bug fix, or
  behavior-changing configuration change that needs implementation, tests, or
  validation. The coordinator assigns a precise slice; it does not implement
  that slice itself.
- Automatically spawn `reviewer` after every non-trivial or risk-bearing code
  change, before describing the task as complete. Review findings remain
  independent; the reviewer never fixes them.
- Automatically spawn `publisher` only after the user explicitly asks for both
  commit and push. The coordinator never performs Git publishing itself.

Before spawning, announce the selected role and its purpose. Keep the assigned
slice small and request a concise report. Do not run multiple agents on the
same problem unless independent review is justified.

## Monitoring

Start the local monitor once per task before the first automatic spawn:

```powershell
& "$HOME/plugins/subagent-monitor/scripts/start.ps1"
```

For every automatically selected subagent, generate a short unique id.
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

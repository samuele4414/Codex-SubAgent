# ChatSubAgent routing

Use a subagent only when delegation reduces risk or saves meaningful discovery
work. Do not delegate simple answers, one focused read, or trivial edits.

- Broad repository discovery, conventions, data flow, callers, or tests: `scout`.
- Bounded implementation or bug fix that needs tests or validation: `builder`.
- Meaningful or risk-bearing completed diffs: `reviewer`.
- Commit and push only after the user explicitly asks for both: `publisher`.

Before spawning, announce the selected role and its purpose. Keep the assigned
slice small and request a concise report. Do not run multiple agents on the
same problem unless independent review is justified.

`scout` is read-only. `builder` never commits or pushes. `reviewer` never fixes
its own findings. `publisher` never changes product code, must preserve
unrelated working-tree changes, and creates one plain imperative-English commit
title per coherent change without Conventional Commit prefixes.

If a task needs a choice that materially affects product behaviour, security,
or an external system, obtain user direction rather than assuming it.

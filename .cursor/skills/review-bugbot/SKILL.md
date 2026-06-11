---
name: review-bugbot
description: Review code changes with Bugbot subagent (AxeCoder Task).
---
# Review Bugbot

Use this skill when the user asks to run `/review-bugbot` or wants a Bugbot-style code review.

Launch exactly one `bugbot` subagent via the **Task** tool with:

- `readonly: true`
- `run_in_background: false` unless explicitly asked to run in background
- `description: "Bugbot"`
- `subagent_type: "bugbot"`

AxeCoder precomputes the git diff when the subagent starts — do not run git diff yourself before launching. The repository path should be the active workspace or repository root.

Use this exact prompt shape:

```text
Full Repository Path: <absolute repository path>
Diff: <one of: "branch changes", "uncommitted changes">
Base Branch: <only when reviewing against a specific base branch>
Custom Instructions: <only when the user gave specific review instructions>
```

Default to `branch changes` (merge-base vs default base branch, including committed/staged/unstaged). Use `uncommitted changes` for dirty working tree only.

After the subagent finishes, summarize findings in a table: Severity | Location (file:line) | Finding. Do not fix issues unless the user asks.

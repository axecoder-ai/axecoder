---
name: review-security
description: Review code changes with Security Review subagent (AxeCoder Task).
---
# Review Security

Use this skill when the user asks to run `/review-security` or wants a security review of local changes.

Launch exactly one `security-review` subagent via the **Task** tool with:

- `readonly: true`
- `run_in_background: false` unless explicitly asked to run in background
- `description: "Security Review"`
- `subagent_type: "security-review"`

AxeCoder precomputes the git diff when the subagent starts — do not run git diff yourself before launching.

Use this exact prompt shape:

```text
Full Repository Path: <absolute repository path>
Diff: <one of: "branch changes", "uncommitted changes">
Base Branch: <only when reviewing against a specific base branch>
Custom Instructions: <only when the user gave specific review instructions>
```

Default to `branch changes`. Use `uncommitted changes` for dirty working tree only.

After the subagent finishes, summarize findings: Severity | Location (file:line) | Finding. Do not fix issues unless the user asks.

import type { AgentToolDef } from './agent-types'
import { CC_BUILTIN_SUBAGENT_TYPES } from './agent-subagent-types'
import { SMART_MODE_APPROVAL_PROPERTIES } from './agent-smart-review-params'

const padToolDesc = (text: string, min = 800) => {
  let s = text.trim()
  const tail =
    ' Subagents cannot spawn further subagents. Return a concise report. Do not use for trivial one-step tasks.'
  if (!s.includes('cannot spawn')) s += tail
  while (s.length < min) s += ' Delegate with Task when isolated context helps.'
  return s
}


const READ_DESCRIPTION = `Reads a file from the local filesystem. You can access any file directly by using this tool.
Assume this tool can read ALL files the user can access. If the path is valid, read it; do not refuse with "not accessible" without trying.

Usage:
- The file_path is relative to the project root (workspace). Example: \`src/App.vue\`, \`electron/main/agent/agent-loop.ts\`.
- By default this tool returns the entire file content with line numbers prefixed (1-based), which is ideal for citations and for preparing exact \`old_string\` matches in Edit.
- You MUST use this tool to read a file before calling Edit on the same file. The executor enforces Read-before-Edit.
- Very large files may be rejected with a size limit error; in that case use Grep to locate sections or ask the user.
- Paths outside the project root are denied for safety.

When NOT to use:
- Do not use Bash (cat, head, tail, sed) to read files when Read is available.
- Do not guess file contents; read the file.

If you need multiple files and there are no dependencies between reads, call Read in parallel.`


const EDIT_DESCRIPTION = `Performs exact string replacements in files.

Usage:
- You MUST Read the file at file_path before editing it at least once in the current session.
- file_path is relative to the project root.
- old_string must match the file contents exactly, including whitespace and indentation. If the match is not unique in the file, the tool fails unless replace_all is true.
- When replace_all is true, every occurrence of old_string is replaced. Use this for renaming symbols across a file.
- new_string is the replacement text. Use an empty string to delete matched text.
- Prefer editing existing files over creating new ones. Make focused changes; do not refactor unrelated code in the same edit.

When NOT to use:
- Do not use sed, awk, or Bash redirection to edit files when Edit is available.
- Do not use Write for small targeted changes when Edit suffices.

The change is presented to the user for approval before it is applied to disk.`


const WRITE_DESCRIPTION = `Writes a file to the local filesystem. This tool will create the file if it does not exist, or overwrite it if it does.

Usage:
- file_path is relative to the project root.
- content is the full new file contents (not a patch).
- Parent directories are created as needed.
- Prefer Edit for modifying existing files. Use Write when creating a new file or when replacing the entire file is simpler than a precise Edit.
- Do not create files unless necessary for the user's task.

When NOT to use:
- Do not use echo, heredoc, or Bash to create or overwrite files when Write is available.

The write is presented to the user for approval before it is applied to disk.`

const APPLY_PATCH_DESCRIPTION = `Apply a unified diff patch to one or more files in the project.

Usage:
- Pass the full patch in \`patch\` (standard unified diff; multiple files allowed).
- Prefer ApplyPatch for several hunks or files in one step. Use Edit for small single replacements; Write for full-file overwrite.
- Paths must be relative to the project root and inside the workspace.

Changes require user approval unless Auto Run is enabled (same as Edit/Write).`

const REVERT_TURN_DESCRIPTION = `Revert file changes from the agent session checkpoint or a single-file patch.

Usage:
- scope=file (default): provide file_path and patch (unified diff from turn changes) to undo one file.
- scope=turn or all: restore all checkpointed files for this session; optional checkpoint_id selects a specific checkpoint.
- Read the checkpoint list via /rewind or session metadata when the user asks to undo a whole turn.

When NOT to use:
- Do not use git checkout or git restore via Bash to undo agent edits when RevertTurn applies.
- RevertTurn restores agent checkpoint snapshots, not arbitrary git refs.
- For git-level undo of commits, use Bash git only when the user explicitly requests git operations.`


const GLOB_DESCRIPTION = `Fast file search based on glob patterns. Returns matching paths relative to the project root, sorted by modification time (newest first).

Usage:
- pattern is a glob such as \`**/*.ts\`, \`src/**/*.vue\`, \`tests/unittest/**/agent*.test.ts\`.
- Patterns not starting with \`**/\` are treated as recursive under the hood.
- Results are capped (hundreds of paths); narrow the pattern if truncated.
- Use this tool when you need to discover files by name or extension.

When NOT to use:
- Do not use find, ls, or tree in Bash when Glob is available.
- For searching *inside* file contents, use Grep instead.`


const GREP_DESCRIPTION = `Search file contents in the project using ripgrep (plain text pattern).

Usage:
- pattern is searched as plain text (not full regex unless you escape metacharacters intentionally).
- Common build and vendor directories (e.g. node_modules, .git, dist) are excluded automatically.
- Results include file paths and line numbers; use them for navigation and for planning Edits.
- Output is capped; refine the pattern if too many hits.

When NOT to use:
- Do not run grep or rg via Bash when Grep is available.
- For finding files by path/name only, use Glob.`


const DELETE_DESCRIPTION = `Deletes a file or directory inside the project.

Usage:
- file_path is relative to the project root.
- Deleting a directory removes it recursively.
- This is destructive and irreversible once approved. Confirm intent when the user did not explicitly ask to delete.

When NOT to use:
- Do not use rm -rf in Bash for project files when Delete is available.

The deletion is presented to the user for approval before it is applied.`


const MOVE_DESCRIPTION = `Moves or renames a file or directory within the project.

Usage:
- from_path and to_path are relative to the project root.
- The destination must not already exist.
- Parent directories for the destination are created as needed.
- Prefer Move over copy-then-delete when reorganizing files.

When NOT to use:
- Do not use mv in Bash for project paths when Move is available.

The move is presented to the user for approval before it is applied.`


const GIT_STATUS_DESCRIPTION = `Read-only summary of local git repository state. Returns branch name, upstream tracking (ahead/behind), and a porcelain list of changed files.

Usage:
- No parameters required. Runs in the project root git repository.
- Read-only: executes immediately without user approval (unlike Bash git status).
- Use before GitDiff or commit workflows to understand working tree state.

When NOT to use:
- Do not use \`git status\` via Bash when GitStatus is available.
- For remote PR/CI status use Bash with \`gh\` (forge env is injected automatically).
- GitStatus does not show diff content — use GitDiff for that.`

const GIT_DIFF_DESCRIPTION = `Read-only git diff output for the project repository.

Usage:
- Default: unstaged working tree diff (same as git diff).
- staged: true — show staged diff (--cached).
- ref: optional branch or commit for comparison (git diff ref...HEAD), e.g. main or origin/main.
- Read-only: executes immediately without user approval.

When NOT to use:
- Do not use \`git diff\` via Bash for routine inspection when GitDiff is available.
- For GitHub PR diffs on the remote host use \`gh pr diff\` via Bash.
- GitDiff does not include commit messages — use GitLog for history.`

const GIT_LOG_DESCRIPTION = `Read-only recent commit history (oneline format with decorations).

Usage:
- limit: number of commits (default 20, max 100).
- ref: starting ref (default HEAD); use a branch name to log from that tip.
- Read-only: executes immediately without user approval.

When NOT to use:
- Do not use \`git log\` via Bash for routine history when GitLog is available.
- For comparing branches across many commits prefer GitDiff with a ref parameter.
- GitLog does not show file-level diffs — use GitDiff for patch content.`


const BASH_DESCRIPTION = `Executes a shell command in the project root. Each invocation uses a fresh non-interactive shell (cwd is the project root; shell state is not preserved across calls).

CRITICAL — Do NOT use Bash when a dedicated tool exists:
- To read files use \`Read\` instead of cat, head, tail, or sed
- To edit files use Edit instead of sed or awk
- To create/overwrite files use Write instead of echo redirection or heredoc
- To find files by path use Glob instead of find or ls
- To search file contents use Grep instead of grep or rg
- To inspect local git state use GitStatus, GitDiff, or GitLog instead of git status/diff/log via Bash
- When MCP servers are listed in your instructions, use \`CallMcpTool\` / \`ListMcpResources\` / \`ReadMcpResource\` for those capabilities — do NOT run or install CLI clients for the same job (e.g. never use \`mongosh\`/\`mysql\` when \`mongodb\`/\`mysql\` MCP is available)
Reserve Bash for system commands and terminal operations that truly require shell execution (package installs, remote forge via gh, builds, tests, process management). Do not use Bash to install tools that duplicate an available MCP server.

GitHub / forge (remote):
- For GitHub PR, issues, and CI checks use \`gh\` via Bash (GH_HOST/GH_TOKEN are injected automatically).
- Read-only gh commands (gh pr view/list/checks, gh run view/list, etc.) execute without user approval.

Usage:
- command (required): a single shell command string. Quote paths that contain spaces.
- timeout: optional timeout in milliseconds (default 120000, max 600000). Alias: timeout_ms.
- description: optional short label for the UI (3–10 words).
- run_in_background: when true, start the command asynchronously after approval and return a task id immediately. Do not append \`&\` to the command. Poll output with TaskOutput using task_id. For multi-step interactive prompts, use ShellStdin with the same task_id.
- stdin: optional string piped to the command stdin on start (single-shot). After write, stdin is closed. For ongoing interaction use run_in_background + ShellStdin + TaskOutput.
- Foreground calls block until the command finishes; stdout/stderr are returned (large output truncated).
- Some commands require user approval before execution.

Git and safety:
- NEVER update git config. NEVER run destructive git commands (push --force, hard reset) unless the user explicitly requests them.
- NEVER skip hooks (--no-verify) unless the user explicitly requests it.
- Do not commit unless the user asked you to commit.
- Prefer dedicated tools for file operations inside the repo.`

/** Cursor Composer Task tool — 子代理 API */
const TASK_DESCRIPTION = `Launch a new subagent (Task). Subagents do not see the parent conversation — put all needed context in prompt.

When to use:
- Parallel exploration while you work on another area.
- Isolated subtasks with a clear, self-contained prompt.

When NOT to use:
- Trivial one-step actions (single Read/Grep/Edit).
- Tasks that need AskUserQuestion (subagents cannot ask the user).
- Nested subagents (subagents cannot call Task).

Parameters:
- description: short 3–5 word label for UI/logging.
- prompt: full instructions for the subagent.
- subagent_type: built-in profile (explore read-only, shell for terminal-only, bugbot/security-review for diff review, etc.).
- model: optional model id override.
- resume: agent id to continue a prior subagent transcript.
- readonly: force read-only tools even for generalPurpose.
- run_in_background: return task id immediately; poll with TaskOutput (use block:true to wait).
- interrupt: with resume, stop a running background subagent.
- file_attachments: optional paths to attach for the subagent.

Return includes Agent id for resume. Summarize results for the user — they may not see the subagent transcript.`

const AGENT_DESCRIPTION = `Deprecated alias for Task. Use the Task tool instead.`


const ASK_USER_QUESTION_DESCRIPTION = `Ask the user structured multiple-choice questions when you need clarification or decisions you cannot infer from the codebase.

Alias: you may also call this tool as \`AskQuestion\` (same behavior).

Usage:
- Provide one or more questions. Each question needs id, prompt (question text), and at least two options (id + label).
- allow_multiple: when true, the user may select more than one option for that question.
- The UI presents choices; the user does not need to type free-form answers unless they choose "Other" flows outside this tool.

When to use:
- You are genuinely stuck after investigation (read files, grep, try a fix) and need a product or preference decision.
- Multiple valid approaches exist and the user's choice materially affects the implementation.

When NOT to use:
- Not as a first response to friction — diagnose errors and read code first.
- For information you can obtain with Read, Grep, Glob, or Bash.
- To confirm actions you should already know from the user's message or project conventions.

Do not use a colon before tool calls in surrounding text; keep user-facing prose brief.`

/** 核心文件/Shell/子代理工具（不含Extensions层） */
export const buildCoreAgentTools = (): AgentToolDef[] => [
  {
    name: 'Read',
    description: READ_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description:
            'Relative path under the project root, e.g. README.md, src/App.vue, electron/main/agent/agent-loop.ts. Must be inside the workspace.',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Edit',
    description: EDIT_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative path under the project root to the file to modify.',
        },
        old_string: {
          type: 'string',
          description:
            'Exact text to replace (must match the file byte-for-byte including whitespace). Must be unique unless replace_all is true.',
        },
        new_string: {
          type: 'string',
          description: 'Replacement text. Empty string deletes the matched region.',
        },
        replace_all: {
          type: 'boolean',
          description:
            'If true, replace every occurrence of old_string in the file. If false (default), old_string must match exactly once.',
        },
      },
      required: ['file_path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'Write',
    description: WRITE_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description:
            'Relative path under the project root. Creates parent directories if needed.',
        },
        content: {
          type: 'string',
          description: 'Full file contents to write (overwrites existing file).',
        },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'ApplyPatch',
    description: APPLY_PATCH_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        patch: {
          type: 'string',
          description: 'Unified diff text describing all file changes to apply.',
        },
        patchText: {
          type: 'string',
          description: 'Alias for patch.',
        },
      },
      required: ['patch'],
    },
  },
  {
    name: 'RevertTurn',
    description: REVERT_TURN_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          description: 'file | turn | all — file reverts one path; turn/all restores checkpoint files.',
        },
        file_path: {
          type: 'string',
          description: 'Relative path when scope=file.',
        },
        patch: {
          type: 'string',
          description: 'Per-file unified diff to reverse when scope=file.',
        },
        patchText: {
          type: 'string',
          description: 'Alias for patch.',
        },
        checkpoint_id: {
          type: 'string',
          description: 'Optional checkpoint id when scope=turn or all.',
        },
      },
    },
  },
  {
    name: 'Glob',
    description: GLOB_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description:
            'Glob pattern, e.g. **/*.ts, src/**/*.vue. Recursive patterns are supported.',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Grep',
    description: GREP_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description:
            'Plain-text search string to find in file contents across the project (ripgrep).',
        },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Delete',
    description: DELETE_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description:
            'Relative path under the project root to a file or directory to delete.',
        },
        ...SMART_MODE_APPROVAL_PROPERTIES,
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Move',
    description: MOVE_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        from_path: {
          type: 'string',
          description: 'Relative path under the project root for the existing file or directory.',
        },
        to_path: {
          type: 'string',
          description:
            'Relative path under the project root for the destination. Must not already exist.',
        },
      },
      required: ['from_path', 'to_path'],
    },
  },
  {
    name: 'GitStatus',
    description: GIT_STATUS_DESCRIPTION,
    parameters: { type: 'object', properties: {} },
  },
  {
    name: 'GitDiff',
    description: GIT_DIFF_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        staged: {
          type: 'boolean',
          description: 'If true, show staged diff (--cached). Default false (working tree).',
        },
        ref: {
          type: 'string',
          description: 'Optional ref for comparison (git diff ref...HEAD), e.g. main or origin/main.',
        },
      },
    },
  },
  {
    name: 'GitLog',
    description: GIT_LOG_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Number of commits (default 20, max 100).',
        },
        ref: {
          type: 'string',
          description: 'Starting ref (default HEAD).',
        },
      },
    },
  },
  {
    name: 'Bash',
    description: BASH_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description:
            'Shell command to execute in the project root. Use for git, npm test, builds—not for file read/write/search.',
        },
        timeout: {
          type: 'number',
          description: 'Optional timeout in milliseconds (default 120000, max 600000).',
        },
        timeout_ms: {
          type: 'number',
          description: 'Deprecated alias for timeout.',
        },
        description: {
          type: 'string',
          description: 'Short activity description for the UI (optional).',
        },
        run_in_background: {
          type: 'boolean',
          description:
            'If true, run asynchronously after approval; use TaskOutput with the returned task_id to read output.',
        },
        stdin: {
          type: 'string',
          description:
            'Optional stdin to pipe when the command starts (single-shot). Use ShellStdin for multi-step interactive input on background tasks.',
        },
        ...SMART_MODE_APPROVAL_PROPERTIES,
      },
      required: ['command'],
    },
  },
  {
    name: 'Task',
    description: padToolDesc(TASK_DESCRIPTION),
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Short 3-5 word summary for logging and UI.',
        },
        prompt: {
          type: 'string',
          description: 'Detailed task for the subagent. Required unless interrupt-only.',
        },
        subagent_type: {
          type: 'string',
          description:
            'Built-in profile (explore, shell, bugbot, security-review, …) or custom agent name from .cursor/agents.',
        },
        model: {
          type: 'string',
          description: 'Optional model id override for this subagent.',
        },
        resume: {
          type: 'string',
          description: 'Agent id from a prior Task to continue the same transcript.',
        },
        readonly: {
          type: 'boolean',
          description: 'Force read-only tool set.',
        },
        run_in_background: {
          type: 'boolean',
          description: 'Run async; use TaskOutput with task_id (block:true to wait).',
        },
        interrupt: {
          type: 'boolean',
          description: 'When true with resume, stop the running background subagent.',
        },
        file_attachments: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional file paths to pass into the subagent prompt.',
        },
      },
      required: ['description', 'prompt'],
    },
  },
  {
    name: 'Agent',
    description: padToolDesc(AGENT_DESCRIPTION),
    parameters: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        prompt: { type: 'string' },
        subagent_type: { type: 'string', enum: [...CC_BUILTIN_SUBAGENT_TYPES] },
        run_in_background: { type: 'boolean' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'AskUserQuestion',
    description: ASK_USER_QUESTION_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          description: 'One or more questions for the user (minimum one).',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Stable identifier for this question' },
              prompt: { type: 'string', description: 'Question text shown to the user' },
              options: {
                type: 'array',
                description: 'At least two answer options',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', description: 'Option identifier' },
                    label: { type: 'string', description: 'Display text for this option' },
                  },
                  required: ['id', 'label'],
                },
              },
              allow_multiple: {
                type: 'boolean',
                description: 'If true, the user may select multiple options for this question.',
              },
            },
            required: ['id', 'prompt', 'options'],
          },
        },
      },
      required: ['questions'],
    },
  },
]

/** @deprecated 使用 buildFullAgentTools / AGENT_TOOLS */
export const buildAgentTools = buildCoreAgentTools

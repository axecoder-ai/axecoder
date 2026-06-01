import type { AgentToolDef } from './agent-types'

/** Claude Code §14 — Read tool API description */
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

/** Claude Code §14 — Edit tool API description */
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

/** Claude Code §14 — Write tool API description */
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

/** Claude Code §14 — Glob tool API description */
const GLOB_DESCRIPTION = `Fast file search based on glob patterns. Returns matching paths relative to the project root, sorted by modification time (newest first).

Usage:
- pattern is a glob such as \`**/*.ts\`, \`src/**/*.vue\`, \`tests/unittest/**/agent*.test.ts\`.
- Patterns not starting with \`**/\` are treated as recursive under the hood.
- Results are capped (hundreds of paths); narrow the pattern if truncated.
- Use this tool when you need to discover files by name or extension.

When NOT to use:
- Do not use find, ls, or tree in Bash when Glob is available.
- For searching *inside* file contents, use Grep instead.`

/** Claude Code §14 — Grep tool API description */
const GREP_DESCRIPTION = `Search file contents in the project using ripgrep (plain text pattern).

Usage:
- pattern is searched as plain text (not full regex unless you escape metacharacters intentionally).
- Common build and vendor directories (e.g. node_modules, .git, dist) are excluded automatically.
- Results include file paths and line numbers; use them for navigation and for planning Edits.
- Output is capped; refine the pattern if too many hits.

When NOT to use:
- Do not run grep or rg via Bash when Grep is available.
- For finding files by path/name only, use Glob.`

/** Claude Code §14 — Delete tool API description */
const DELETE_DESCRIPTION = `Deletes a file or directory inside the project.

Usage:
- file_path is relative to the project root.
- Deleting a directory removes it recursively.
- This is destructive and irreversible once approved. Confirm intent when the user did not explicitly ask to delete.

When NOT to use:
- Do not use rm -rf in Bash for project files when Delete is available.

The deletion is presented to the user for approval before it is applied.`

/** Claude Code §14 — Move tool API description */
const MOVE_DESCRIPTION = `Moves or renames a file or directory within the project.

Usage:
- from_path and to_path are relative to the project root.
- The destination must not already exist.
- Parent directories for the destination are created as needed.
- Prefer Move over copy-then-delete when reorganizing files.

When NOT to use:
- Do not use mv in Bash for project paths when Move is available.

The move is presented to the user for approval before it is applied.`

/** Claude Code §14 — Bash tool API description (AxeCoder subset) */
const BASH_DESCRIPTION = `Executes a shell command in the project root. The shell is non-interactive.

CRITICAL — Do NOT use Bash when a dedicated tool exists:
- To read files use \`Read\` instead of cat, head, tail, or sed
- To edit files use Edit instead of sed or awk
- To create/overwrite files use Write instead of echo redirection or heredoc
- To find files by path use Glob instead of find or ls
- To search file contents use Grep instead of grep or rg
Reserve Bash for system commands and terminal operations that truly require shell execution (package installs, git, builds, tests, process management).

Usage:
- command: a single shell command string. Quote paths that contain spaces.
- timeout_ms: optional timeout in milliseconds (default 120000). Long-running commands may time out.
- stdout/stderr are returned; very large output is truncated.
- Commands run with cwd set to the project root.
- Some commands may require user approval before execution.

Git and safety:
- NEVER update git config. NEVER run destructive git commands (push --force, hard reset) unless the user explicitly requests them.
- NEVER skip hooks (--no-verify) unless the user explicitly requests it.
- Do not commit unless the user asked you to commit.
- Prefer dedicated tools for file operations inside the repo.

Do not start long-running dev servers or watch processes unless the user asked; there is no background job UI in this tool.`

/** Claude Code §14 — Agent tool API description */
const AGENT_DESCRIPTION = `Launch a new agent that has access to the same tools as this session (except Agent and AskUserQuestion). The sub-agent runs autonomously for a bounded number of turns and returns a concise report.

When to use:
- Parallel exploration: e.g. search one area of the codebase while you work on another.
- Delegated subtasks that can run in isolation with a clear prompt.

When NOT to use:
- Trivial one-step actions you can do yourself (a single Read, Grep, or Edit).
- Tasks that require asking the user questions (sub-agents cannot use AskUserQuestion).
- Nested delegation: sub-agents cannot spawn further sub-agents.

Usage:
- prompt (required): detailed task instructions for the sub-agent. Include all context it needs; it does not see the full parent conversation.
- description (optional): short 3–5 word summary for logging.

The sub-agent completes the task fully but without gold-plating. Respond to the user with a concise summary of what the sub-agent found or changed — the user may not see the sub-agent transcript.`

/** Claude Code §14 — AskUserQuestion tool API description */
const ASK_USER_QUESTION_DESCRIPTION = `Ask the user structured multiple-choice questions when you need clarification or decisions you cannot infer from the codebase.

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

/** 核心文件/Shell/子代理工具（不含扩展层） */
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
        timeout_ms: {
          type: 'number',
          description: 'Optional timeout in milliseconds (default 120000).',
        },
      },
      required: ['command'],
    },
  },
  {
    name: 'Agent',
    description: AGENT_DESCRIPTION,
    parameters: {
      type: 'object',
      properties: {
        description: {
          type: 'string',
          description: 'Short summary of the task (3-5 words) for logging.',
        },
        prompt: {
          type: 'string',
          description:
            'Detailed task instructions for the sub-agent. Required. Include goals, constraints, and what to return in the report.',
        },
        subagent_type: {
          type: 'string',
          enum: ['generalPurpose', 'explore', 'plan'],
          description:
            'Sub-agent profile: explore (read-only), plan (read-only planning), generalPurpose (default).',
        },
        run_in_background: {
          type: 'boolean',
          description:
            'If true, start sub-agent in background and return task id; use TaskOutput to read results.',
        },
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

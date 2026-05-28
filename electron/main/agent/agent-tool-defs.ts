import type { AgentToolDef } from './agent-types'
import { COMPLEX_AGENT_TOOLS } from './tools-complex/defs'

export type { AgentToolDef } from './agent-types'

export const BASIC_AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'Read',
    description: 'Read a file from the project. Required before Edit on the same file.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative path under project root, e.g. README.md or docs/plan.md',
        },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Edit',
    description:
      'Replace exact old_string with new_string in a file. old_string must be unique unless replace_all is true.',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Relative path under project root' },
        old_string: { type: 'string' },
        new_string: { type: 'string' },
        replace_all: { type: 'boolean' },
      },
      required: ['file_path', 'old_string', 'new_string'],
    },
  },
  {
    name: 'Write',
    description: 'Create or overwrite a file with full content.',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Relative path under project root' },
        content: { type: 'string' },
      },
      required: ['file_path', 'content'],
    },
  },
  {
    name: 'Grep',
    description: 'Search file contents in the project using ripgrep.',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern (plain text)' },
      },
      required: ['pattern'],
    },
  },
  {
    name: 'Delete',
    description: 'Delete a file or directory inside the project.',
    parameters: {
      type: 'object',
      properties: {
        file_path: { type: 'string', description: 'Relative path under project root' },
      },
      required: ['file_path'],
    },
  },
  {
    name: 'Move',
    description: 'Move or rename a file/directory within the project.',
    parameters: {
      type: 'object',
      properties: {
        from_path: { type: 'string', description: 'Relative path under project root' },
        to_path: { type: 'string', description: 'Relative path under project root' },
      },
      required: ['from_path', 'to_path'],
    },
  },
]

export const AGENT_TOOLS: AgentToolDef[] = [...BASIC_AGENT_TOOLS, ...COMPLEX_AGENT_TOOLS]

const AGENT_SYSTEM_PROMPT_BASE = `You are WritCraft project assistant with file tools.
- Use Read before Edit on the same file.
- Prefer Edit over Write for existing files.
- Use Grep to find files before reading.
- file_path / from_path / to_path must be relative paths under the project root (e.g. README.md). Never invent absolute paths or paths on other machines.
- Do not use shell commands for file operations.`

export const buildAgentSystemPrompt = (projectRoot: string) => {
  const root = projectRoot.trim()
  return `${AGENT_SYSTEM_PROMPT_BASE}
- Project root (only files under here are accessible): ${root}`
}

/** @deprecated 使用 buildAgentSystemPrompt(projectRoot) */
export const AGENT_SYSTEM_PROMPT = AGENT_SYSTEM_PROMPT_BASE

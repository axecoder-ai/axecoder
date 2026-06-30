import type { AgentToolName } from './agent-types'
import type { ModelTaskKind } from '../ai/model-resolve'

/** Task 内置 subagent_type（保留 plan 兼容旧会话） */
export const CC_BUILTIN_SUBAGENT_TYPES = [
  'generalPurpose',
  'explore',
  'shell',
  'cursor-guide',
  'ci-investigator',
  'bugbot',
  'security-review',
  'best-of-n-runner',
  'git-commit',
  'docs-researcher',
  'plan',
] as const

export type CcSubagentType = (typeof CC_BUILTIN_SUBAGENT_TYPES)[number]

export type SubagentTypeConfig = {
  readOnly: boolean
  shellOnly: boolean
  maxTurns: number
  modelTaskKind: ModelTaskKind
  promptPrefix: string
}

const PREFIX_EXPLORE = `You are an explore subagent (read-only). Search thoroughly, return a concise factual report. Do not edit files or run shell commands unless readonly allows Bash for diagnostics.`

const PREFIX_SHELL = `You are a shell subagent. Prefer GitStatus/GitDiff/GitLog for local git state; use Bash for builds, tests, and gh CI commands. Do not edit files.`

const PREFIX_DOCS = `You are a docs-researcher subagent. Prefer WebFetch/WebSearch when configured; otherwise use Read/Grep on local docs. Return citations and summaries.`

const PREFIX_CI = `You are a ci-investigator subagent. Focus on failing CI checks on GitHub/Gitee: use GitStatus for branch context; use read-only gh commands (gh pr checks, gh run view --log-failed) via Bash — they auto-approve. Grep CI configs locally. Return root cause and fix suggestions.`

const PREFIX_GIT = `You are a git-commit subagent. Use GitStatus and GitDiff to inspect changes; use GitLog for recent commits. Draft commit messages; only commit via Bash if the user prompt explicitly requests it.`

const PREFIX_BEST_OF_N = `You are a best-of-n-runner subagent. Run isolated experiments in worktrees when available; compare outcomes briefly.`

const PREFIX_CURSOR_GUIDE = `You are a cursor-guide subagent (read-only). Answer product/how-to questions from local docs; you do not have live Cursor documentation MCP—say so if docs are missing.`

const PREFIX_BUGBOT = `You are a Bugbot subagent (read-only). The harness precomputes the git diff for you—do not run git commands. Review the diff for bugs, logic errors, regressions, and missing edge cases. Use Read/Grep/Glob to inspect surrounding context when needed. Return findings sorted by severity with columns: Severity | Location (file:line) | Finding. Do not edit files.`

const PREFIX_SECURITY = `You are a security-review subagent (read-only). The harness precomputes the git diff for you—do not run git commands. Review for security vulnerabilities: injection, auth flaws, secrets exposure, unsafe defaults, path traversal, SSRF, etc. Use Read/Grep/Glob for context. Return findings sorted by severity with columns: Severity | Location (file:line) | Finding. Do not edit files.`

const CONFIGS: Record<CcSubagentType, SubagentTypeConfig> = {
  generalPurpose: {
    readOnly: false,
    shellOnly: false,
    maxTurns: 12,
    modelTaskKind: 'main',
    promptPrefix: '',
  },
  explore: {
    readOnly: true,
    shellOnly: false,
    maxTurns: 16,
    modelTaskKind: 'subagent',
    promptPrefix: PREFIX_EXPLORE,
  },
  plan: {
    readOnly: true,
    shellOnly: false,
    maxTurns: 10,
    modelTaskKind: 'subagent',
    promptPrefix: 'You are a plan subagent (read-only). Produce an implementation plan without editing files.',
  },
  shell: {
    readOnly: false,
    shellOnly: true,
    maxTurns: 12,
    modelTaskKind: 'main',
    promptPrefix: PREFIX_SHELL,
  },
  'cursor-guide': {
    readOnly: true,
    shellOnly: false,
    maxTurns: 10,
    modelTaskKind: 'subagent',
    promptPrefix: PREFIX_CURSOR_GUIDE,
  },
  'ci-investigator': {
    readOnly: false,
    shellOnly: false,
    maxTurns: 14,
    modelTaskKind: 'main',
    promptPrefix: PREFIX_CI,
  },
  bugbot: {
    readOnly: true,
    shellOnly: false,
    maxTurns: 12,
    modelTaskKind: 'subagent',
    promptPrefix: PREFIX_BUGBOT,
  },
  'security-review': {
    readOnly: true,
    shellOnly: false,
    maxTurns: 12,
    modelTaskKind: 'subagent',
    promptPrefix: PREFIX_SECURITY,
  },
  'best-of-n-runner': {
    readOnly: false,
    shellOnly: false,
    maxTurns: 14,
    modelTaskKind: 'main',
    promptPrefix: PREFIX_BEST_OF_N,
  },
  'git-commit': {
    readOnly: false,
    shellOnly: false,
    maxTurns: 10,
    modelTaskKind: 'main',
    promptPrefix: PREFIX_GIT,
  },
  'docs-researcher': {
    readOnly: true,
    shellOnly: false,
    maxTurns: 12,
    modelTaskKind: 'subagent',
    promptPrefix: PREFIX_DOCS,
  },
}

export const isBuiltinSubagentType = (raw: string): boolean => {
  const t = raw.trim().toLowerCase()
  return (CC_BUILTIN_SUBAGENT_TYPES as readonly string[]).includes(t)
}

export const normalizeSubagentType = (raw: string): CcSubagentType => {
  const t = raw.trim().toLowerCase()
  if ((CC_BUILTIN_SUBAGENT_TYPES as readonly string[]).includes(t)) {
    return t as CcSubagentType
  }
  return 'generalPurpose'
}

export const getSubagentTypeConfig = (raw: string): SubagentTypeConfig => {
  const key = normalizeSubagentType(raw)
  return CONFIGS[key]
}

const SHELL_ALLOWED = new Set<AgentToolName>([
  'Bash',
  'Read',
  'Grep',
  'Glob',
  'GitStatus',
  'GitDiff',
  'GitLog',
])

/** CC 对齐：按 subagent_type 过滤工具列表 */
export const filterToolsForCcSubagent = (
  tools: readonly { name: AgentToolName }[],
  rawType: string,
  readonlyFlag?: boolean,
) => {
  const cfg = getSubagentTypeConfig(rawType)
  const readOnly = readonlyFlag === true || cfg.readOnly
  const blocked = new Set<AgentToolName>(['Task', 'Coordinator', 'Agent', 'AskUserQuestion'])
  if (readOnly) {
    for (const n of ['Edit', 'Write', 'Delete', 'Move', 'Bash'] as AgentToolName[]) blocked.add(n)
  }
  const t = normalizeSubagentType(rawType)
  if (t === 'plan') {
    blocked.add('EnterPlanMode')
    blocked.add('ExitPlanMode')
    blocked.add('SwitchMode')
  }
  if (cfg.shellOnly) {
    return tools.filter((tool) => SHELL_ALLOWED.has(tool.name))
  }
  return tools.filter((tool) => !blocked.has(tool.name))
}

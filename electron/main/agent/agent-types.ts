/** 主 Agent + 子代理可用工具名（对齐 Claude Code getAllBaseTools 缺口表） */
export type AgentToolName =
  | 'Read'
  | 'Edit'
  | 'Write'
  | 'Glob'
  | 'Grep'
  | 'Delete'
  | 'Move'
  | 'AskUserQuestion'
  | 'Bash'
  | 'Task'
  | 'Agent'
  | 'TodoWrite'
  | 'TaskCreate'
  | 'TaskGet'
  | 'TaskUpdate'
  | 'TaskList'
  | 'WebFetch'
  | 'WebSearch'
  | 'NotebookEdit'
  | 'EnterPlanMode'
  | 'ExitPlanMode'
  | 'Skill'
  | 'DiscoverSkills'
  | 'CallMcpTool'
  | 'McpAuth'
  | 'ListMcpResources'
  | 'ReadMcpResource'
  | 'TaskOutput'
  | 'TaskStop'
  | 'ToolSearch'
  | 'LSP'
  | 'EnterWorktree'
  | 'ExitWorktree'
  | 'Sleep'
  | 'Brief'
  | 'Config'
  | 'Workflow'

export type SubagentType =
  | 'generalPurpose'
  | 'explore'
  | 'plan'
  | 'shell'
  | 'cursor-guide'
  | 'ci-investigator'
  | 'best-of-n-runner'
  | 'git-commit'
  | 'docs-researcher'

export type AskUserOption = { id: string; label: string }

export type AskUserQuestionItem = {
  id: string
  prompt: string
  options: AskUserOption[]
  allow_multiple?: boolean
}

export type PendingAskUserPublic = {
  id: string
  questions: AskUserQuestionItem[]
}

export type AgentToolDef = {
  name: AgentToolName
  description: string
  parameters: Record<string, unknown>
}

export type AgentLoopMessage =
  | { role: 'system'; content: string }
  | {
      role: 'user'
      content: string
      images?: import('../models-types').AiChatImagePart[]
    }
  | { role: 'assistant'; content: string; reasoningContent?: string; toolCalls?: AgentToolCall[] }
  | { role: 'tool'; toolCallId: string; name: AgentToolName; content: string }

export type AgentToolCall = {
  id: string
  name: AgentToolName
  arguments: Record<string, unknown>
}

export type PendingWritePublic = {
  id: string
  tool: 'Edit' | 'Write' | 'Delete' | 'Move'
  filePath: string
  summary: string
  patchText: string
}

export type PendingBashPublic = {
  id: string
  command: string
  timeoutMs?: number
  description?: string
  runInBackground?: boolean
}

export type AgentToolLogEntry = {
  name: AgentToolName
  summary: string
  ok: boolean
}

type AgentReplyMeta = {
  assistantContent?: string
  reasoningContent?: string
}

export type AgentSendResult =
  | ({
      ok: true
      status: 'done'
      assistantText: string
      toolLog: AgentToolLogEntry[]
    } & AgentReplyMeta)
  | ({
      ok: true
      status: 'pending'
      sessionId: string
      pending: PendingWritePublic[]
      pendingBashes?: PendingBashPublic[]
      pendingAsks?: PendingAskUserPublic[]
      assistantText: string
      toolLog: AgentToolLogEntry[]
    } & AgentReplyMeta)
  | { ok: false; error: string }

export type AgentContinueResult =
  | ({
      ok: true
      status: 'done'
      assistantText: string
      toolLog: AgentToolLogEntry[]
    } & AgentReplyMeta)
  | ({
      ok: true
      status: 'pending'
      sessionId: string
      pending: PendingWritePublic[]
      pendingBashes?: PendingBashPublic[]
      pendingAsks?: PendingAskUserPublic[]
      assistantText: string
      toolLog: AgentToolLogEntry[]
    } & AgentReplyMeta)
  | { ok: false; error: string }

export const CORE_AGENT_TOOL_NAMES: AgentToolName[] = [
  'Read',
  'Edit',
  'Write',
  'Glob',
  'Grep',
  'Delete',
  'Move',
  'Bash',
  'Task',
  'Agent',
  'AskUserQuestion',
]

export const EXTENDED_AGENT_TOOL_NAMES: AgentToolName[] = [
  'TodoWrite',
  'TaskCreate',
  'TaskGet',
  'TaskUpdate',
  'TaskList',
  'WebFetch',
  'WebSearch',
  'NotebookEdit',
  'EnterPlanMode',
  'ExitPlanMode',
  'Skill',
  'DiscoverSkills',
  'CallMcpTool',
  'McpAuth',
  'ListMcpResources',
  'ReadMcpResource',
  'TaskOutput',
  'TaskStop',
  'ToolSearch',
  'LSP',
  'EnterWorktree',
  'ExitWorktree',
  'Sleep',
  'Brief',
  'Config',
  'Workflow',
]

export const ALL_AGENT_TOOL_NAMES: AgentToolName[] = [
  ...CORE_AGENT_TOOL_NAMES,
  ...EXTENDED_AGENT_TOOL_NAMES,
]

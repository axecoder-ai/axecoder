/** 主 Agent + 子代理可用工具名 */
export type AgentToolName =
  | 'Read'
  | 'Edit'
  | 'Write'
  | 'ApplyPatch'
  | 'RevertTurn'
  | 'Glob'
  | 'Grep'
  | 'Delete'
  | 'Move'
  | 'GitStatus'
  | 'GitDiff'
  | 'GitLog'
  | 'AskUserQuestion'
  | 'Bash'
  | 'Task'
  | 'Coordinator'
  | 'Agent'
  | 'TodoWrite'
  | 'TaskCreate'
  | 'TaskGet'
  | 'TaskUpdate'
  | 'TaskList'
  | 'WebFetch'
  | 'WebSearch'
  | 'WebRun'
  | 'NotebookEdit'
  | 'EnterPlanMode'
  | 'ExitPlanMode'
  | 'SwitchMode'
  | 'CreatePlan'
  | 'Skill'
  | 'DiscoverSkills'
  | 'SlashCommand'
  | 'DiscoverCommands'
  | 'CallMcpTool'
  | 'McpAuth'
  | 'ListMcpResources'
  | 'ReadMcpResource'
  | 'TaskOutput'
  | 'ShellStdin'
  | 'TaskStop'
  | 'ToolSearch'
  | 'LSP'
  | 'ReadLints'
  | 'FixLints'
  | 'CodeGraphExplore'
  | 'CodeGraphSearch'
  | 'CodeGraphNode'
  | 'EnterWorktree'
  | 'ExitWorktree'
  | 'Sleep'
  | 'Brief'
  | 'Config'
  | 'Workflow'
  | 'Remember'
  | 'Forget'
  | 'DisplayDiagram'
  | 'EditDiagram'
  | 'GetDiagram'

export type SubagentType =
  | 'generalPurpose'
  | 'explore'
  | 'plan'
  | 'shell'
  | 'cursor-guide'
  | 'ci-investigator'
  | 'bugbot'
  | 'security-review'
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
  tool: 'Edit' | 'Write' | 'Delete' | 'Move' | 'ApplyPatch'
  filePath: string
  summary: string
  patchText: string
  batchFiles?: { filePath: string; patchText: string }[]
}

export type AgentTurnFileChange = {
  pendingId?: string
  filePath: string
  tool: 'Edit' | 'Write' | 'Delete' | 'Move' | 'ApplyPatch'
  patchText: string
  additions: number
  deletions: number
}

type AgentTurnMeta = {
  fileChanges?: AgentTurnFileChange[]
  rewindSessionId?: string
  rewindCheckpointId?: string
}

export type PendingBashPublic = {
  id: string
  command: string
  timeoutMs?: number
  description?: string
  runInBackground?: boolean
}

export type PendingPlanPublic = {
  id: string
  name: string
  overview: string
  plan: string
  filePath: string
  todos?: { id: string; content: string }[]
}

export type PendingSmartApprovalPublic = {
  id: string
  toolName: AgentToolName
  blockReason: string
  summary: string
  detail: string
}

export type AgentToolLogEntry = {
  name: AgentToolName
  summary: string
  ok: boolean
}

type AgentReplyMeta = {
  assistantContent?: string
  reasoningContent?: string
  speakerUserId?: string
  /** 本轮启动的后台 Task id */
  backgroundTaskIds?: string[]
}

export type AgentSendResult =
  | ({
      ok: true
      status: 'done'
      assistantText: string
      toolLog: AgentToolLogEntry[]
    } & AgentReplyMeta &
      AgentTurnMeta)
  | ({
      ok: true
      status: 'pending'
      sessionId: string
      pending: PendingWritePublic[]
      pendingBashes?: PendingBashPublic[]
      pendingAsks?: PendingAskUserPublic[]
      pendingPlans?: PendingPlanPublic[]
      pendingSmartApprovals?: PendingSmartApprovalPublic[]
      assistantText: string
      toolLog: AgentToolLogEntry[]
    } & AgentReplyMeta &
      AgentTurnMeta)
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
      pendingPlans?: PendingPlanPublic[]
      pendingSmartApprovals?: PendingSmartApprovalPublic[]
      assistantText: string
      toolLog: AgentToolLogEntry[]
    } & AgentReplyMeta)
  | { ok: false; error: string }

export const CORE_AGENT_TOOL_NAMES: AgentToolName[] = [
  'Read',
  'Edit',
  'Write',
  'ApplyPatch',
  'RevertTurn',
  'Glob',
  'Grep',
  'Delete',
  'Move',
  'GitStatus',
  'GitDiff',
  'GitLog',
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
  'Coordinator',
  'WebFetch',
  'WebSearch',
  'WebRun',
  'NotebookEdit',
  'EnterPlanMode',
  'ExitPlanMode',
  'SwitchMode',
  'CreatePlan',
  'Skill',
  'DiscoverSkills',
  'SlashCommand',
  'DiscoverCommands',
  'CallMcpTool',
  'McpAuth',
  'ListMcpResources',
  'ReadMcpResource',
  'TaskOutput',
  'ShellStdin',
  'TaskStop',
  'ToolSearch',
  'LSP',
  'ReadLints',
  'FixLints',
  'CodeGraphExplore',
  'CodeGraphSearch',
  'CodeGraphNode',
  'EnterWorktree',
  'ExitWorktree',
  'Sleep',
  'Brief',
  'Config',
  'Workflow',
  'Remember',
  'Forget',
  'DisplayDiagram',
  'EditDiagram',
  'GetDiagram',
]

export const ALL_AGENT_TOOL_NAMES: AgentToolName[] = [
  ...CORE_AGENT_TOOL_NAMES,
  ...EXTENDED_AGENT_TOOL_NAMES,
]

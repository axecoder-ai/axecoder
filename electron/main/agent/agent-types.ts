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
  | 'Agent'

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
  | { role: 'user'; content: string }
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

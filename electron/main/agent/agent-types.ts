export type AgentBasicToolName = 'Read' | 'Edit' | 'Write' | 'Grep' | 'Delete' | 'Move'

/** 新增复杂 tool 时在此追加名称 */
export type AgentComplexToolName = never

export type AgentToolName = AgentBasicToolName | AgentComplexToolName

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
      assistantText: string
      toolLog: AgentToolLogEntry[]
    } & AgentReplyMeta)
  | { ok: false; error: string }

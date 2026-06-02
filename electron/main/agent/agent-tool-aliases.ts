import type { AgentToolCall, AgentToolName } from './agent-types'
import { ALL_AGENT_TOOL_NAMES } from './agent-types'

/** 模型可能使用的工具名别名 → 规范名 */
const ALIASES: Record<string, AgentToolName> = {
  AskQuestion: 'AskUserQuestion',
}

export const resolveAgentToolName = (raw: string): AgentToolName | undefined => {
  if ((ALL_AGENT_TOOL_NAMES as readonly string[]).includes(raw)) {
    return raw as AgentToolName
  }
  return ALIASES[raw]
}

export const normalizeAgentToolCall = (call: AgentToolCall): AgentToolCall => {
  const canon = resolveAgentToolName(call.name)
  if (!canon || canon === call.name) return call
  return { ...call, name: canon }
}

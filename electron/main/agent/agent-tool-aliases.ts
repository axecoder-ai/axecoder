import type { AgentToolCall, AgentToolName } from './agent-types'
import { ALL_AGENT_TOOL_NAMES } from './agent-types'

/** 模型可能使用的工具名别名 → 规范名 */
const ALIASES: Record<string, AgentToolName> = {
  AskQuestion: 'AskUserQuestion',
  Agent: 'Task',
}

export const resolveAgentToolName = (raw: string): AgentToolName | undefined => {
  if (ALIASES[raw]) return ALIASES[raw]
  if ((ALL_AGENT_TOOL_NAMES as readonly string[]).includes(raw)) {
    return raw as AgentToolName
  }
  return undefined
}

export const normalizeAgentToolCall = (call: AgentToolCall): AgentToolCall => {
  const canon = resolveAgentToolName(call.name)
  if (!canon || canon === call.name) return call
  return { ...call, name: canon }
}

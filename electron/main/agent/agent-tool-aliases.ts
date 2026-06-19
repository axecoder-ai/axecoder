import type { AgentToolCall, AgentToolName } from './agent-types'
import { ALL_AGENT_TOOL_NAMES } from './agent-types'

/** 模型可能使用的工具名别名 → 规范名 */
const ALIASES: Record<string, AgentToolName> = {
  AskQuestion: 'AskUserQuestion',
  Agent: 'Task',
  create_plan: 'CreatePlan',
}

export const resolveAgentToolName = (raw: string): AgentToolName | undefined => {
  if (ALIASES[raw]) return ALIASES[raw]
  if ((ALL_AGENT_TOOL_NAMES as readonly string[]).includes(raw)) {
    return raw as AgentToolName
  }
  return undefined
}

/** 部分 OpenAI 兼容网关/模型会把参数包在 raw_arguments 或 parameters 里 */
export const normalizeToolArguments = (args: Record<string, unknown>): Record<string, unknown> => {
  if (!args || typeof args !== 'object' || Array.isArray(args)) return {}

  const raw = args.raw_arguments ?? args.rawArguments
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return normalizeToolArguments(parsed as Record<string, unknown>)
      }
    } catch {
      /* fall through */
    }
  }

  if (typeof args.arguments === 'string' && args.arguments.trim()) {
    const onlyArgsKey =
      Object.keys(args).length === 1 ||
      (Object.keys(args).length === 2 && typeof args.name === 'string')
    if (onlyArgsKey) {
      try {
        const parsed = JSON.parse(args.arguments) as unknown
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return normalizeToolArguments(parsed as Record<string, unknown>)
        }
      } catch {
        /* fall through */
      }
    }
  }

  const params = args.parameters ?? args.input
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    const keys = Object.keys(args)
    if (keys.length === 1 || (keys.length === 2 && typeof args.name === 'string')) {
      return normalizeToolArguments(params as Record<string, unknown>)
    }
  }

  return args
}

export const normalizeAgentToolCall = (call: AgentToolCall): AgentToolCall => {
  const canon = resolveAgentToolName(call.name) ?? call.name
  const arguments_ = normalizeToolArguments(call.arguments as Record<string, unknown>)
  if (canon === call.name && arguments_ === call.arguments) return call
  return { ...call, name: canon, arguments: arguments_ }
}

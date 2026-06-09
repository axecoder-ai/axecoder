import type { AgentToolDef } from './agent-types'
import { filterToolsForSubagent, getSessionActiveTools } from './agent-ext-executor'
import { buildFullAgentTools } from './agent-tool-registry'
import type { StoredAgentSession } from './agent-session-store'

export type ChatModeId =
  | 'agent'
  | 'auto-plan'
  | 'reflection'
  | 'rppit'
  | 'planning'
  | 'planning-only'
  | 'multi-agent'

export const DEFAULT_CHAT_MODE: ChatModeId = 'agent'

const VALID = new Set<string>([
  'agent',
  'auto-plan',
  'reflection',
  'rppit',
  'planning',
  'planning-only',
  'multi-agent',
])

export const normalizeChatMode = (v: unknown): ChatModeId =>
  typeof v === 'string' && VALID.has(v) ? (v as ChatModeId) : DEFAULT_CHAT_MODE

export const chatModeSystemAddon = (mode: ChatModeId): string => {
  if (mode === 'auto-plan') {
    return '\n\n<chat-mode>Auto Plan: same tools as Agent. Complex multi-step requests may auto-enter read-only plan mode before writes (ExitPlanMode to implement).</chat-mode>'
  }
  if (mode === 'reflection') {
    return '\n\n<chat-mode>Reflection: think step-by-step before acting. State assumptions, options, and trade-offs. Prefer analysis unless the user clearly wants implementation.</chat-mode>'
  }
  if (mode === 'rppit') {
    return '\n\n<chat-mode>rppit: The latest user message embeds the full /rppit command playbook (same as running /rppit). Follow that workflow strictly step by step; use built-in workflow commands under resources/builtin-commands when substeps reference ~/.cursor/commands.</chat-mode>'
  }
  if (mode === 'planning') {
    return '\n\n<chat-mode>Planning: stay in plan mode until the user approves implementation. Explore read-only, then propose a concrete plan before writes.</chat-mode>'
  }
  if (mode === 'planning-only') {
    return '\n\n<chat-mode>Planning Only: read and plan only—no file writes, shell mutations, or sub-agent tasks. Deliver plans and clarifying questions.</chat-mode>'
  }
  if (mode === 'multi-agent') {
    return '\n\n<chat-mode>Multi-Agent: decompose work; use the Task tool to delegate isolated or parallel subtasks when it helps.</chat-mode>'
  }
  return ''
}

export const applyChatModeToNewSession = (session: StoredAgentSession, mode: ChatModeId) => {
  const allTools = buildFullAgentTools()
  if (mode === 'planning' || mode === 'planning-only') {
    session.planMode = true
    session.ctx.planMode = true
  }
  if (mode === 'planning-only') {
    session.activeTools = filterToolsForSubagent(allTools, 'explore') as AgentToolDef[]
    return
  }
  if (mode === 'multi-agent') {
    session.revealedToolNames.add('Task')
    session.revealedToolNames.add('Agent')
    session.activeTools = getSessionActiveTools(allTools, session.revealedToolNames)
    return
  }
}

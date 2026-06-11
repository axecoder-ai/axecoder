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

const DISABLED = new Set<ChatModeId>(['planning-only'])

const VALID = new Set<string>([
  'agent',
  'auto-plan',
  'reflection',
  'rppit',
  'planning',
  'planning-only',
  'multi-agent',
])

export const normalizeChatMode = (v: unknown): ChatModeId => {
  if (typeof v !== 'string' || !VALID.has(v)) return DEFAULT_CHAT_MODE
  const mode = v as ChatModeId
  return DISABLED.has(mode) ? DEFAULT_CHAT_MODE : mode
}

export const chatModeSystemAddon = (mode: ChatModeId): string => {
  if (mode === 'auto-plan') {
    return '\n\n<chat-mode>Auto Plan: same tools as Agent. Complex multi-step requests may auto-enter read-only plan mode before writes (ExitPlanMode to implement). When drafting an implementation plan, call CreatePlan (writes docs/plans/plan-*.md and shows Build)—do not only paste plan markdown in chat.</chat-mode>'
  }
  if (mode === 'reflection') {
    return '\n\n<chat-mode>Reflection: collaboration runs in the Workshop panel with Developer↔Reviewer reflection loops (1–3 rounds). Do not use Task/Agent tools here; user messages trigger the reflection orchestrator.</chat-mode>'
  }
  if (mode === 'rppit') {
    return '\n\n<chat-mode>rppit: The latest user message embeds the full /rppit command playbook (same as running /rppit). Follow that workflow strictly step by step; use built-in workflow commands under resources/builtin-commands when substeps reference ~/.cursor/commands.</chat-mode>'
  }
  if (mode === 'planning') {
    return '\n\n<chat-mode>Planning: stay in plan mode until the user approves implementation. Explore read-only, then call CreatePlan with name, overview, and plan body (saves docs/plans/plan-*.md; user clicks Build to implement)—do not only paste plan markdown in chat.</chat-mode>'
  }
  if (mode === 'planning-only') {
    return '\n\n<chat-mode>Planning Only: read and plan only—no file writes, shell mutations, or sub-agent tasks. Deliver plans and clarifying questions.</chat-mode>'
  }
  if (mode === 'multi-agent') {
    return '\n\n<chat-mode>Multi-Agent: collaboration runs in the Workshop multi-role panel in this chat. Do not use Task/Agent/Coordinator tools here.</chat-mode>'
  }
  return ''
}

export const applyChatModeToNewSession = (session: StoredAgentSession, mode: ChatModeId) => {
  session.chatMode = mode
  applyChatModeEffects(session, mode)
}

/** Cursor playbook + 扩展 ChatMode 子集；不含 rppit / multi-agent */
export const SWITCH_MODE_TARGETS = new Set([
  'agent',
  'plan',
  'planning',
  'auto-plan',
])

export const resolveSwitchModeTarget = (raw: string): ChatModeId | null => {
  const v = raw.trim()
  if (v === 'plan') return 'planning'
  if (v === 'agent') return 'agent'
  if (SWITCH_MODE_TARGETS.has(v) && VALID.has(v)) return v as ChatModeId
  return null
}

const applyChatModeEffects = (session: StoredAgentSession, mode: ChatModeId) => {
  const allTools = buildFullAgentTools()
  if (mode === 'planning' || mode === 'planning-only') {
    session.planMode = true
    session.ctx.planMode = true
  } else if (mode === 'agent' || mode === 'auto-plan' || mode === 'reflection') {
    session.planMode = false
    session.ctx.planMode = false
  }
  if (mode === 'planning-only') {
    session.activeTools = filterToolsForSubagent(allTools, 'explore') as AgentToolDef[]
    return
  }
  if (mode === 'multi-agent') {
    session.activeTools = getSessionActiveTools(allTools, session.revealedToolNames)
    return
  }
  session.activeTools = getSessionActiveTools(allTools, session.revealedToolNames)
}

export const applySwitchModeToSession = (
  session: StoredAgentSession,
  targetModeId: string,
): { ok: true; chatMode: ChatModeId; message: string } | { ok: false; error: string } => {
  const chatMode = resolveSwitchModeTarget(targetModeId)
  if (!chatMode) {
    return {
      ok: false,
      error: `Unknown or unsupported target_mode_id "${targetModeId}". Use agent, plan, planning, or auto-plan.`,
    }
  }
  session.chatMode = chatMode
  applyChatModeEffects(session, chatMode)
  const label = targetModeId.trim() === 'plan' ? 'plan (planning)' : chatMode
  return { ok: true, chatMode, message: `Switched to ${label} mode.` }
}

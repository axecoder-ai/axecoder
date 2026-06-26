import type { AgentToolDef, AgentToolName } from './agent-types'
import { filterToolsForSubagent, getSessionActiveTools } from './agent-ext-executor'
import { buildFullAgentTools } from './agent-tool-registry'
import type { StoredAgentSession } from './agent-session-store'
import { normalizeAutoPlan } from './agent-auto-plan'

export type ChatModeId =
  | 'agent'
  | 'auto-plan'
  | 'plan'
  | 'planning'
  | 'planning-only'
  | 'multi-agent'
  | 'software-company'
  | 'draw-io'

export const DEFAULT_CHAT_MODE: ChatModeId = 'agent'

const DISABLED = new Set<ChatModeId>(['planning-only'])

const VALID = new Set<string>([
  'agent',
  'auto-plan',
  'plan',
  'planning',
  'planning-only',
  'multi-agent',
  'software-company',
  'draw-io',
])

export const normalizeChatMode = (v: unknown): ChatModeId => {
  if (typeof v !== 'string') return DEFAULT_CHAT_MODE
  if (v === 'reflection' || v === 'rppit') return DEFAULT_CHAT_MODE
  if (!VALID.has(v)) return DEFAULT_CHAT_MODE
  const mode = v as ChatModeId
  if (mode === 'auto-plan') return 'agent'
  if (mode === 'planning') return 'plan'
  return DISABLED.has(mode) ? DEFAULT_CHAT_MODE : mode
}

export const shouldTriggerAutoPlanOnTurn = (
  chatMode: ChatModeId,
  agentAutoPlan: unknown,
  opts: { planMode: boolean; bypass: boolean; hasUserMessage: boolean },
): boolean => {
  if (!opts.hasUserMessage || opts.planMode || opts.bypass) return false
  if (chatMode !== 'agent') return false
  return normalizeAutoPlan(agentAutoPlan) === 'on'
}

const AGENT_MODE_ADDON =
  '\n\n<chat-mode>Agent: read/write code and use tools. Complex multi-step requests may auto-enter read-only plan mode before writes (ExitPlanMode to implement; disable via settings or /auto-plan off). When drafting an implementation plan, call CreatePlan (writes docs/plans/plan-*.md and shows Build)—do not only paste plan markdown in chat.</chat-mode>'

export const chatModeSystemAddon = (mode: ChatModeId): string => {
  if (mode === 'agent' || mode === 'auto-plan') {
    return AGENT_MODE_ADDON
  }
  if (mode === 'plan' || mode === 'planning') {
    return '\n\n<chat-mode>Plan: stay in plan mode until the user approves implementation. Explore read-only, then call CreatePlan with name, overview, and plan body (saves docs/plans/plan-*.md; user clicks Build to implement)—do not only paste plan markdown in chat.</chat-mode>'
  }
  if (mode === 'planning-only') {
    return '\n\n<chat-mode>Planning Only: read and plan only—no file writes, shell mutations, or sub-agent tasks. Deliver plans and clarifying questions.</chat-mode>'
  }
  if (mode === 'multi-agent') {
    return '\n\n<chat-mode>Multi-Agent: collaboration runs in the Workshop multi-role panel in this chat. Do not use Task/Agent/Coordinator tools here.</chat-mode>'
  }
  if (mode === 'software-company') {
    return '\n\n<chat-mode>Software Company: MetaGPT SOP (PRD → Design → Tasks → Code → QA) with dedicated roles. Each role runs one continuous Agent session (full tools, same loop as Agent mode). Deliver structured artifacts to docs/deliverables/{slug}/_artifacts/. Task sub-agents allowed when helpful.</chat-mode>'
  }
  if (mode === 'draw-io') {
    return '\n\n<chat-mode>Draw.IO: AI diagram editing in the Workshop panel with an embedded draw.io canvas. Use DisplayDiagram, EditDiagram, and GetDiagram for diagram changes. You may use Read/Grep/Glob/CodeGraph tools to inspect the codebase and label layers with accurate file paths and symbols. Do not use Task/Agent/Coordinator or file mutation tools here.</chat-mode>'
  }
  return ''
}

export const applyChatModeToNewSession = (session: StoredAgentSession, mode: ChatModeId) => {
  session.chatMode = mode
  applyChatModeEffects(session, mode)
}

/** Cursor playbook + 扩展 ChatMode 子集；不含 rppit / multi-agent */
export const SWITCH_MODE_TARGETS = new Set(['agent', 'plan', 'planning', 'auto-plan'])

export const resolveSwitchModeTarget = (raw: string): ChatModeId | null => {
  const v = raw.trim()
  if (v === 'plan' || v === 'planning') return 'plan'
  if (v === 'agent' || v === 'auto-plan') return 'agent'
  if (SWITCH_MODE_TARGETS.has(v) && VALID.has(v)) return normalizeChatMode(v)
  return null
}

const DRAW_IO_DIAGRAM_TOOLS = ['DisplayDiagram', 'EditDiagram', 'GetDiagram'] as const
const DRAW_IO_READ_TOOLS = [
  'Read',
  'Grep',
  'Glob',
  'ReadLints',
  'CodeGraphExplore',
  'CodeGraphSearch',
  'CodeGraphNode',
  'LSP',
] as const

export const DRAW_IO_TOOL_NAMES = new Set<AgentToolName>([
  ...DRAW_IO_DIAGRAM_TOOLS,
  ...DRAW_IO_READ_TOOLS,
])

export const filterToolsForDrawIo = (tools: readonly AgentToolDef[]) =>
  tools.filter((t) => DRAW_IO_TOOL_NAMES.has(t.name))

const applyChatModeEffects = (session: StoredAgentSession, mode: ChatModeId) => {
  const allTools = buildFullAgentTools()
  if (mode === 'plan' || mode === 'planning' || mode === 'planning-only') {
    session.planMode = true
    session.ctx.planMode = true
  } else if (mode === 'agent' || mode === 'auto-plan') {
    session.planMode = false
    session.ctx.planMode = false
  }
  if (mode === 'planning-only') {
    session.activeTools = filterToolsForSubagent(allTools, 'explore') as AgentToolDef[]
    return
  }
  if (mode === 'multi-agent' || mode === 'software-company' || mode === 'draw-io') {
    session.activeTools = getSessionActiveTools(allTools, session.revealedToolNames)
    if (mode === 'draw-io') {
      session.activeTools = filterToolsForDrawIo(allTools)
    }
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
      error: `Unknown or unsupported target_mode_id "${targetModeId}". Use agent or plan.`,
    }
  }
  session.chatMode = chatMode
  applyChatModeEffects(session, chatMode)
  const trimmed = targetModeId.trim()
  const label = trimmed === 'planning' ? 'plan' : trimmed === 'auto-plan' ? 'agent' : chatMode
  return { ok: true, chatMode, message: `Switched to ${label} mode.` }
}

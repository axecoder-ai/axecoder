import { getConfig } from '../config-store'
import { getModelById } from '../models-store'
import { t } from '../i18n'
import { modelSupportsAgentTools, runAgentLoopUntilDoneOrPending } from '../agent/agent-loop'
import type { AgentLoopMessage } from '../agent/agent-types'
import { buildAgentSystemPrompt } from '../agent/agent-system-prompt'
import {
  chatModeSystemAddon,
  applyChatModeToNewSession,
  DRAW_IO_TOOL_NAMES,
  filterToolsForDrawIo,
} from '../agent/chat-mode'
import { ensureScratchpadDir } from '../agent/agent-scratchpad'
import { refreshCustomOutputStylesCache } from '../agent/agent-output-styles-custom'
import { createLoopGuardState } from '../agent/agent-loop-guard'
import {
  getSession,
  putSession,
  type StoredAgentSession,
} from '../agent/agent-session-store'
import { buildFullAgentTools } from '../agent/agent-tool-registry'
import type { AgentContext } from '../agent/tool-executor'
import { buildWorkshopStreamId } from '../workshop/workshop-stream'
import type {
  WorkshopProgressHandler,
  WorkshopSession,
} from '../workshop/workshop-types'
import { saveWorkshopSession } from '../workshop/workshop-store'
import { DRAW_IO_SYSTEM_ADDON } from './draw-io-prompt'
import { bindDrawIoWorkshopSession } from './draw-io-session-cache'
import { getWorkshopDiagramXml } from './draw-io-store'

export type SendDrawIoWorkshopOptions = {
  displayText?: string
  projectRoot: string
}

export const sendDrawIoWorkshopMessage = async (
  session: WorkshopSession,
  text: string,
  modelId: string,
  onProgress: WorkshopProgressHandler,
  options: SendDrawIoWorkshopOptions,
): Promise<
  | { ok: true; session: WorkshopSession }
  | { ok: false; error: string }
> => {
  const root = options.projectRoot.trim()
  const userText = text.trim()
  if (!userText) return { ok: false, error: t('errors.emptyTask') }

  const model = await getModelById(modelId)
  if (!model) return { ok: false, error: t('errors.modelNotFound') }
  if (!modelSupportsAgentTools(model)) {
    return { ok: false, error: t('errors.agentToolsUnsupported') }
  }

  const display = options.displayText?.trim() || userText
  bindDrawIoWorkshopSession(session)
  session.messages.push({
    id: `m-${Date.now()}-u`,
    roleId: 'user',
    text: display,
    createdAt: Date.now(),
  })

  onProgress('manager', 'thinking')
  const sid = buildWorkshopStreamId(session.id, 'drawio')
  const cfg = await getConfig()
  const revealedToolNames = new Set(DRAW_IO_TOOL_NAMES)
  const allTools = buildFullAgentTools()
  const activeTools = filterToolsForDrawIo(allTools)
  const scratchpadDir = await ensureScratchpadDir(sid)
  const ctx: AgentContext = {
    projectRoot: root,
    readCache: new Set(),
    modelId,
    sessionId: sid,
    planMode: false,
    scratchpadDir,
    drawIoWorkshopId: session.id,
  }

  await refreshCustomOutputStylesCache(root)

  const userMsg: AgentLoopMessage = {
    role: 'user',
    content: `[Draw.IO]\nCurrent diagram is loaded in the editor panel.\n\nUser request:\n${userText}`,
  }

  const existing = getSession(sid)
  if (existing) {
    existing.messages.push(userMsg)
    existing.activeTools = activeTools
    existing.ctx.drawIoWorkshopId = session.id
    putSession(sid, existing)
    const result = await runAgentLoopUntilDoneOrPending(sid, existing)
    return finishDrawIoTurn(root, session, result, onProgress)
  }

  const messages: AgentLoopMessage[] = [
    {
      role: 'system',
      content:
        (await buildAgentSystemPrompt(root, {
          modelId: model.modelId,
          enabledToolNames: activeTools.map((t) => t.name),
          outputStyleId: cfg.agentOutputStyle,
          scratchpadDir,
          agentFrcKeepToolMessages: cfg.agentFrcKeepToolMessages ?? 8,
        })) +
        chatModeSystemAddon('draw-io') +
        DRAW_IO_SYSTEM_ADDON +
        `\n\n<diagram-xml-hint>Diagram has ${getWorkshopDiagramXml(session).length} chars loaded.</diagram-xml-hint>`,
    },
    userMsg,
  ]

  const stored: StoredAgentSession = {
    projectRoot: root,
    modelId,
    messages,
    ctx,
    toolLog: [],
    pendingById: new Map(),
    pendingBashById: new Map(),
    pendingAskById: new Map(),
    pendingPlanById: new Map(),
    turn: 0,
    planMode: false,
    chatMode: 'draw-io',
    revealedToolNames,
    activeTools,
    proactiveEnabled: false,
    proactiveTick: 0,
    scratchpadDir,
    compactedOnce: false,
    loopGuard: createLoopGuardState(),
  }
  applyChatModeToNewSession(stored, 'draw-io')
  putSession(sid, stored)
  const result = await runAgentLoopUntilDoneOrPending(sid, stored)
  return finishDrawIoTurn(root, session, result, onProgress)
}

const finishDrawIoTurn = async (
  projectRoot: string,
  session: WorkshopSession,
  result: Awaited<ReturnType<typeof runAgentLoopUntilDoneOrPending>>,
  onProgress: WorkshopProgressHandler,
): Promise<
  | { ok: true; session: WorkshopSession }
  | { ok: false; error: string }
> => {
  if (!result.ok) {
    onProgress('manager', 'done')
    return { ok: false, error: result.error }
  }

  const report = (result.assistantText || '').trim()
  if (report) {
    session.messages.push({
      id: `m-${Date.now()}-a`,
      roleId: 'manager',
      text: report,
      createdAt: Date.now(),
    })
  } else if (session.diagramXml) {
    session.messages.push({
      id: `m-${Date.now()}-a`,
      roleId: 'manager',
      text: 'Diagram updated.',
      createdAt: Date.now(),
    })
  }

  onProgress('manager', 'done')
  const saved = await saveWorkshopSession(projectRoot, session)
  if (!saved.ok) return { ok: false, error: saved.error }
  return { ok: true, session }
}

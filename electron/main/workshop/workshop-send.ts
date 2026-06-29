import {
  deleteWorkshopSession,
  getWorkshopSession,
  listWorkshopSessions,
  newWorkshopSession,
  saveWorkshopSession,
} from './workshop-store'
import { sendWorkshopMessage } from './workshop-turn-orchestrator'
import { buildWorkshopRouterLlm } from './workshop-router-llm'
import { buildAgentRoleSpeaker } from './workshop-agent-speaker'
import { delegateEmitWorkshopProgress } from './workshop-progress-emit'
import type { WorkshopSession, WorkshopProgressHandler } from './workshop-types'
import { getModelById } from '../models-store'
import { resolveChatImageRefs, chatImageRefPreviewDataUrl, type ChatImageRef } from '../chat-attachments'
import type { AiChatImagePart } from '../models-types'
import {
  scriptedMemberSpeaker,
  scriptedRouterLlm,
} from './workshop-turn-orchestrator'
import { sendDrawIoWorkshopMessage } from '../draw-io/draw-io-turn'
import { sendSopPipelineMessage, skipSopPipelineGate } from '../sop/sop-pipeline-engine'
import { modelSupportsVision } from '../../../shared/ai/vision'
import { visionUnsupportedError } from '../ai/ai-vision-guard'
import { stopAgentTurn } from '../agent/agent-loop'
import { listAgentSessions } from '../agent/agent-session-store'

export const workshopListSessions = (projectRoot: string) =>
  listWorkshopSessions(typeof projectRoot === 'string' ? projectRoot : '')

export const workshopGetSession = (projectRoot: string, workshopId: string) =>
  getWorkshopSession(typeof projectRoot === 'string' ? projectRoot : '', workshopId)

export const workshopSaveSession = (projectRoot: string, session: WorkshopSession) =>
  saveWorkshopSession(typeof projectRoot === 'string' ? projectRoot : '', session)

export const workshopDeleteSession = (projectRoot: string, workshopId: string) =>
  deleteWorkshopSession(typeof projectRoot === 'string' ? projectRoot : '', workshopId)

export const workshopStop = (workshopId: string) => {
  const wid = typeof workshopId === 'string' ? workshopId.trim() : ''
  if (!wid) return { ok: false as const, error: 'Invalid workshop id' }
  const prefix = `workshop-${wid}-`
  let stopped = 0
  for (const { id } of listAgentSessions()) {
    if (id.startsWith(prefix)) {
      stopAgentTurn(id)
      stopped++
    }
  }
  return { ok: true as const, stopped }
}

export const runWorkshopSend = async (
  root: string,
  workshopId: string,
  text: string,
  modelId: string,
  useScripted?: boolean,
  displayText?: string,
  imageRefs?: ChatImageRef[],
  preferredAssigneeUserId?: string,
  orchestrationChatMode?: string,
) => {
  let session: WorkshopSession | null = null
  if (workshopId?.trim()) {
    const got = await getWorkshopSession(root, workshopId)
    session = got.session
  }
  if (!session) {
    session = newWorkshopSession(root, text, modelId, workshopId)
  } else if (modelId?.trim()) {
    session.modelId = modelId
  }
  let userImages: AiChatImagePart[] | undefined
  const refs = Array.isArray(imageRefs) ? imageRefs : []
  if (refs.length) {
    userImages = await resolveChatImageRefs(refs)
    session.pendingUserImages = userImages
  }

  const speaker =
    useScripted || process.env.AXECODER_WORKSHOP_SCRIPTED === '1'
      ? scriptedMemberSpeaker
      : buildAgentRoleSpeaker(
          root,
          session.modelId,
          session.id,
          () => session!.pendingUserImages,
        )
  const routerLlm =
    useScripted || process.env.AXECODER_WORKSHOP_SCRIPTED === '1'
      ? scriptedRouterLlm({})
      : buildWorkshopRouterLlm(session.modelId, root)
  if (!useScripted && process.env.AXECODER_WORKSHOP_SCRIPTED !== '1') {
    const model = await getModelById(session.modelId)
    if (!model) return { ok: false as const, error: 'Model not found' }
    if (refs.length && !modelSupportsVision(model)) {
      return { ok: false as const, error: visionUnsupportedError(model) }
    }
  }
  const sendOptions = {
    displayText,
    userImages,
    userImageRefs: refs.length ? refs : undefined,
    userImagePreviews: refs.length
      ? (
          await Promise.all(
            refs.map(async (ref) => {
              try {
                return await chatImageRefPreviewDataUrl(ref)
              } catch {
                return ''
              }
            }),
          )
        ).filter(Boolean)
      : undefined,
    preferredAssigneeUserId,
    projectRoot: root,
  }
  const onProgress: WorkshopProgressHandler = (roleId, status, speakerUserId) => {
    delegateEmitWorkshopProgress({ workshopId: session!.id, roleId, status, speakerUserId })
    if (status === 'done') {
      void saveWorkshopSession(root, session!).catch(() => {
        /* 增量落盘失败不中断编排 */
      })
    }
  }
  const res =
    orchestrationChatMode === 'software-company'
      ? await sendSopPipelineMessage(session, text, speaker, onProgress, {
          ...sendOptions,
          projectRoot: root,
        })
      : orchestrationChatMode === 'draw-io'
        ? await sendDrawIoWorkshopMessage(session, text, modelId, onProgress, {
            ...sendOptions,
            projectRoot: root,
          })
        : await sendWorkshopMessage(session, text, speaker, routerLlm, onProgress, sendOptions)
  if (!res.ok) return res
  res.session.pendingUserImages = undefined
  const saved = await saveWorkshopSession(root, res.session)
  if (!saved.ok) return { ok: false as const, error: saved.error }
  return { ok: true as const, session: res.session }
}

export const runWorkshopSkipSopGate = async (
  root: string,
  workshopId: string,
  useScripted?: boolean,
) => {
  const got = await getWorkshopSession(root, workshopId)
  const session = got.session
  if (!session) return { ok: false as const, error: 'Session not found' }
  if (!session.pendingSopGate) return { ok: false as const, error: 'No SOP gate to skip' }

  const speaker =
    useScripted || process.env.AXECODER_WORKSHOP_SCRIPTED === '1'
      ? scriptedMemberSpeaker
      : buildAgentRoleSpeaker(
          root,
          session.modelId,
          session.id,
          () => session!.pendingUserImages,
        )
  const onProgress: WorkshopProgressHandler = (roleId, status, speakerUserId) => {
    delegateEmitWorkshopProgress({ workshopId: session.id, roleId, status, speakerUserId })
    if (status === 'done') {
      void saveWorkshopSession(root, session).catch(() => {
        /* 增量落盘失败不中断编排 */
      })
    }
  }
  const res = await skipSopPipelineGate(session, speaker, onProgress, { projectRoot: root })
  if (!res.ok) return res
  const saved = await saveWorkshopSession(root, res.session)
  if (!saved.ok) return { ok: false as const, error: saved.error }
  return { ok: true as const, session: res.session }
}

import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import {
  deleteWorkshopSession,
  getWorkshopSession,
  listWorkshopSessions,
  newWorkshopSession,
  saveWorkshopSession,
} from './workshop/workshop-store'
import { sendWorkshopMessage } from './workshop/workshop-turn-orchestrator'
import { buildWorkshopRouterLlm } from './workshop/workshop-router-llm'
import { buildAgentRoleSpeaker } from './workshop/workshop-agent-speaker'
import { bindWorkshopProgressWindow, emitWorkshopProgress } from './workshop/workshop-progress-emit'
import type { WorkshopSession } from './workshop/workshop-types'
import { getModelById } from './models-store'
import { resolveChatImageRefs, type ChatImageRef } from './chat-attachments'
import type { AiChatImagePart } from './models-types'
import {
  scriptedMemberSpeaker,
  scriptedRouterLlm,
} from './workshop/workshop-turn-orchestrator'

export const registerWorkshopIpc = (getMainWindow: () => BrowserWindow | null) => {
  bindWorkshopProgressWindow(getMainWindow)

  ipcMain.handle('workshop:getSessions', async (_, projectRoot: string) =>
    listWorkshopSessions(typeof projectRoot === 'string' ? projectRoot : ''),
  )

  ipcMain.handle('workshop:getSession', async (_, projectRoot: string, workshopId: string) =>
    getWorkshopSession(typeof projectRoot === 'string' ? projectRoot : '', workshopId),
  )

  ipcMain.handle('workshop:saveSession', async (_, projectRoot: string, session: WorkshopSession) =>
    saveWorkshopSession(typeof projectRoot === 'string' ? projectRoot : '', session),
  )

  ipcMain.handle('workshop:deleteSession', async (_, projectRoot: string, workshopId: string) =>
    deleteWorkshopSession(typeof projectRoot === 'string' ? projectRoot : '', workshopId),
  )

  const runSend = async (
    root: string,
    workshopId: string,
    text: string,
    modelId: string,
    useScripted?: boolean,
    displayText?: string,
    imageRefs?: ChatImageRef[],
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
        : buildWorkshopRouterLlm(session.modelId)
    if (!useScripted && process.env.AXECODER_WORKSHOP_SCRIPTED !== '1') {
      const model = await getModelById(session.modelId)
      if (!model) return { ok: false as const, error: 'Model not found' }
    }
    const res = await sendWorkshopMessage(
      session,
      text,
      speaker,
      routerLlm,
      (roleId, status) => {
        emitWorkshopProgress({ workshopId: session!.id, roleId, status })
      },
      displayText,
      userImages,
    )
    if (!res.ok) return res
    const saved = await saveWorkshopSession(root, res.session)
    if (!saved.ok) return { ok: false as const, error: saved.error }
    return { ok: true as const, session: res.session }
  }

  ipcMain.handle(
    'workshop:sendMessage',
    async (
      _,
      projectRoot: string,
      workshopId: string,
      text: string,
      modelId: string,
      useScripted?: boolean,
      displayText?: string,
      imageRefs?: ChatImageRef[],
    ) =>
      runSend(
        typeof projectRoot === 'string' ? projectRoot : '',
        workshopId,
        text,
        modelId,
        useScripted,
        displayText,
        imageRefs,
      ),
  )

  /** @deprecated 使用 workshop:sendMessage */
  ipcMain.handle(
    'workshop:startRun',
    async (
      _,
      projectRoot: string,
      workshopId: string,
      userBrief: string,
      modelId: string,
      useScripted?: boolean,
    ) =>
      runSend(
        typeof projectRoot === 'string' ? projectRoot : '',
        workshopId,
        userBrief,
        modelId,
        useScripted,
      ),
  )

  /** @deprecated 使用 workshop:sendMessage（waiting_user 阶段发澄清回答） */
  ipcMain.handle(
    'workshop:sendUserAnswer',
    async (
      _,
      projectRoot: string,
      workshopId: string,
      answer: string,
      useScripted?: boolean,
    ) => {
      const root = typeof projectRoot === 'string' ? projectRoot : ''
      const got = await getWorkshopSession(root, workshopId)
      if (!got.session) return { ok: false as const, error: 'Session not found' }
      return runSend(root, workshopId, answer, got.session.modelId, useScripted)
    },
  )
}

import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import {
  deleteWorkshopSession,
  getWorkshopSession,
  listWorkshopSessions,
  newWorkshopSession,
  saveWorkshopSession,
} from './workshop/workshop-store'
import {
  answerWorkshopQuestion,
  scriptedRoleSpeaker,
  startWorkshopRun,
} from './workshop/workshop-orchestrator'
import { buildAgentRoleSpeaker } from './workshop/workshop-agent-speaker'
import { bindWorkshopProgressWindow, emitWorkshopProgress } from './workshop/workshop-progress-emit'
import type { WorkshopSession } from './workshop/workshop-types'
import { getModelById } from './models-store'

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

  ipcMain.handle(
    'workshop:startRun',
    async (
      _,
      projectRoot: string,
      workshopId: string,
      userBrief: string,
      modelId: string,
      useScripted?: boolean,
    ) => {
      const root = typeof projectRoot === 'string' ? projectRoot : ''
      let session: WorkshopSession | null = null
      if (workshopId?.trim()) {
        const got = await getWorkshopSession(root, workshopId)
        session = got.session
      }
      if (!session) {
        session = newWorkshopSession(root, userBrief, modelId, workshopId)
      } else {
        session.modelId = modelId
      }
      const speaker =
        useScripted || process.env.AXECODER_WORKSHOP_SCRIPTED === '1'
          ? scriptedRoleSpeaker
          : buildAgentRoleSpeaker(root, modelId, session.id)
      if (!useScripted && process.env.AXECODER_WORKSHOP_SCRIPTED !== '1') {
        const model = await getModelById(modelId)
        if (!model) return { ok: false as const, error: '模型不存在' }
      }
      const res = await startWorkshopRun(session, userBrief, speaker, (roleId, status) => {
        emitWorkshopProgress({ workshopId: session!.id, roleId, status })
      })
      if (!res.ok) return res
      const saved = await saveWorkshopSession(root, res.session)
      if (!saved.ok) return { ok: false as const, error: saved.error }
      return { ok: true as const, session: res.session }
    },
  )

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
      if (!got.session) return { ok: false as const, error: '会话不存在' }
      const session = got.session
      const speaker =
        useScripted || process.env.AXECODER_WORKSHOP_SCRIPTED === '1'
          ? scriptedRoleSpeaker
          : buildAgentRoleSpeaker(root, session.modelId, session.id)
      const res = await answerWorkshopQuestion(session, answer, speaker, (roleId, status) => {
        emitWorkshopProgress({ workshopId: session.id, roleId, status })
      })
      if (!res.ok) return res
      const saved = await saveWorkshopSession(root, res.session)
      if (!saved.ok) return { ok: false as const, error: saved.error }
      return { ok: true as const, session: res.session }
    },
  )
}

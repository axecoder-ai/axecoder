import { ipcMain } from 'electron'
import type { BrowserWindow } from 'electron'
import type { WorkshopSession } from './workshop/workshop-types'
import type { ChatImageRef } from './chat-attachments'
import { withWorkshopRuntime } from './workshop-runtime-proxy'
import {
  runWorkshopSend,
  workshopDeleteSession,
  workshopGetSession,
  workshopListSessions,
  workshopSaveSession,
  workshopStop,
  runWorkshopSkipSopGate,
} from './workshop/workshop-send'

export const registerWorkshopIpc = (_getMainWindow: () => BrowserWindow | null) => {
  ipcMain.handle('workshop:getSessions', async (_, projectRoot: string) =>
    withWorkshopRuntime(
      () => workshopListSessions(typeof projectRoot === 'string' ? projectRoot : ''),
      (b) => b.call('getSessions', { projectRoot }),
    ),
  )

  ipcMain.handle('workshop:getSession', async (_, projectRoot: string, workshopId: string) =>
    withWorkshopRuntime(
      () => workshopGetSession(typeof projectRoot === 'string' ? projectRoot : '', workshopId),
      (b) => b.call('getSession', { projectRoot, workshopId }),
    ),
  )

  ipcMain.handle('workshop:saveSession', async (_, projectRoot: string, session: WorkshopSession) =>
    withWorkshopRuntime(
      () => workshopSaveSession(typeof projectRoot === 'string' ? projectRoot : '', session),
      (b) => b.call('saveSession', { projectRoot, session }),
    ),
  )

  ipcMain.handle('workshop:deleteSession', async (_, projectRoot: string, workshopId: string) =>
    withWorkshopRuntime(
      () => workshopDeleteSession(typeof projectRoot === 'string' ? projectRoot : '', workshopId),
      (b) => b.call('deleteSession', { projectRoot, workshopId }),
    ),
  )

  ipcMain.handle('workshop:stop', async (_, workshopId: string) =>
    withWorkshopRuntime(
      () => workshopStop(typeof workshopId === 'string' ? workshopId : ''),
      (b) => b.call('stop', { workshopId }),
    ),
  )

  const runSend = (
    root: string,
    workshopId: string,
    text: string,
    modelId: string,
    useScripted?: boolean,
    displayText?: string,
    imageRefs?: ChatImageRef[],
    preferredAssigneeUserId?: string,
    orchestrationChatMode?: string,
  ) =>
    withWorkshopRuntime(
      () =>
        runWorkshopSend(
          root,
          workshopId,
          text,
          modelId,
          useScripted,
          displayText,
          imageRefs,
          preferredAssigneeUserId,
          orchestrationChatMode,
        ),
      (b) =>
        b.call('sendMessage', {
          projectRoot: root,
          workshopId,
          text,
          modelId,
          useScripted,
          displayText,
          imageRefs,
          preferredAssigneeUserId,
          orchestrationChatMode,
        }),
    )

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
      preferredAssigneeUserId?: string,
      orchestrationChatMode?: string,
    ) =>
      runSend(
        typeof projectRoot === 'string' ? projectRoot : '',
        workshopId,
        text,
        modelId,
        useScripted,
        displayText,
        imageRefs,
        preferredAssigneeUserId,
        orchestrationChatMode,
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

  /** @deprecated 使用 workshop:sendMessage */
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
      const got = await withWorkshopRuntime(
        () => workshopGetSession(root, workshopId),
        (b) => b.call('getSession', { projectRoot: root, workshopId }),
      )
      if (!got.session) return { ok: false as const, error: 'Session not found' }
      return runSend(root, workshopId, answer, got.session.modelId, useScripted)
    },
  )

  ipcMain.handle(
    'workshop:skipSopGate',
    async (_, projectRoot: string, workshopId: string, useScripted?: boolean) =>
      withWorkshopRuntime(
        () =>
          runWorkshopSkipSopGate(
            typeof projectRoot === 'string' ? projectRoot : '',
            workshopId,
            useScripted,
          ),
        (b) => b.call('skipSopGate', { projectRoot, workshopId, useScripted }),
      ),
  )
}

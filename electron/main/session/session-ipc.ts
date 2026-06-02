import { ipcMain } from 'electron'
import { listAllSessions } from './session-registry'
import { suggestChatSessionTitle, type TitleDialogMessage } from './session-title'

export const registerSessionIpc = () => {
  ipcMain.handle('session:listAll', async (_, projectRoot: string) =>
    listAllSessions(typeof projectRoot === 'string' ? projectRoot : ''),
  )

  ipcMain.handle(
    'session:suggestTitle',
    async (
      _,
      modelId: string,
      messages: TitleDialogMessage[],
      currentTitle: string,
    ) => {
      const list = Array.isArray(messages) ? messages : []
      const normalized: TitleDialogMessage[] = list
        .filter(
          (m) =>
            m &&
            (m.role === 'user' || m.role === 'assistant') &&
            typeof m.text === 'string',
        )
        .map((m) => ({ role: m.role, text: m.text }))
      return suggestChatSessionTitle(
        typeof modelId === 'string' ? modelId : '',
        normalized,
        typeof currentTitle === 'string' ? currentTitle : '',
      )
    },
  )
}

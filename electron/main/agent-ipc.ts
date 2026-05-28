import { ipcMain, type BrowserWindow } from 'electron'
import type { AiChatMessage } from './models-types'
import { confirmAgentWrite, rejectAgentWrite, startAgentTurn } from './agent/agent-loop'
import { bindAgentProgressWindow } from './agent/agent-progress-emit'

export const registerAgentIpc = (getMainWindow: () => BrowserWindow | null) => {
  bindAgentProgressWindow(getMainWindow)
  ipcMain.handle(
    'agent:send',
    async (
      _,
      projectRoot: string,
      modelId: string,
      messages: AiChatMessage[],
    ) => {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
          ...(m.role === 'assistant' && m.reasoningContent
            ? { reasoningContent: m.reasoningContent }
            : {}),
        }))
      if (!history.some((m) => m.role === 'user')) {
        return { ok: false as const, error: '无用户消息' }
      }
      return startAgentTurn(projectRoot, modelId, history)
    },
  )

  ipcMain.handle('agent:confirmWrite', async (_, sessionId: string, pendingId: string) => {
    return confirmAgentWrite(sessionId, pendingId)
  })

  ipcMain.handle(
    'agent:rejectWrite',
    async (_, sessionId: string, pendingId: string, reason?: string) => {
      return rejectAgentWrite(sessionId, pendingId, reason)
    },
  )
}

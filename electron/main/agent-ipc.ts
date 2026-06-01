import { ipcMain, type BrowserWindow } from 'electron'
import type { AiChatMessage } from './models-types'
import {
  answerAgentQuestions,
  confirmAgentAllWrites,
  confirmAgentBash,
  confirmAgentWrite,
  rejectAgentAllWrites,
  rejectAgentBash,
  rejectAgentWrite,
  startAgentTurn,
} from './agent/agent-loop'
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

  ipcMain.handle('agent:confirmAllWrites', async (_, sessionId: string) => {
    return confirmAgentAllWrites(sessionId)
  })

  ipcMain.handle(
    'agent:rejectWrite',
    async (_, sessionId: string, pendingId: string, reason?: string) => {
      return rejectAgentWrite(sessionId, pendingId, reason)
    },
  )

  ipcMain.handle(
    'agent:rejectAllWrites',
    async (_, sessionId: string, reason?: string) => {
      return rejectAgentAllWrites(sessionId, reason)
    },
  )

  ipcMain.handle('agent:confirmBash', async (_, sessionId: string, pendingId: string) => {
    return confirmAgentBash(sessionId, pendingId)
  })

  ipcMain.handle(
    'agent:rejectBash',
    async (_, sessionId: string, pendingId: string, reason?: string) => {
      return rejectAgentBash(sessionId, pendingId, reason)
    },
  )

  ipcMain.handle(
    'agent:answerQuestions',
    async (
      _,
      sessionId: string,
      pendingId: string,
      answers: Record<string, string | string[]>,
    ) => {
      return answerAgentQuestions(sessionId, pendingId, answers)
    },
  )
}

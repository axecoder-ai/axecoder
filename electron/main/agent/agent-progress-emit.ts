import type { BrowserWindow } from 'electron'
import type { AgentProgressPayload } from '../../../src/utils/agent-progress'

let getMainWindow: (() => BrowserWindow | null) | null = null

export const bindAgentProgressWindow = (fn: () => BrowserWindow | null) => {
  getMainWindow = fn
}

export const emitAgentProgress = (payload: AgentProgressPayload) => {
  getMainWindow?.()?.webContents.send('agent:progress', payload)
}

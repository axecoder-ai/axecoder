import { app, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  clearAiTraceEvents,
  getAiTraceEventsForExport,
  getAiTraceState,
  setAiTraceRecording,
} from './ai-trace-store'

export const registerAiTraceIpc = () => {
  ipcMain.handle('aiTrace:getState', () => getAiTraceState())

  ipcMain.handle('aiTrace:setRecording', (_e, on: boolean) => {
    setAiTraceRecording(!!on)
    return getAiTraceState()
  })

  ipcMain.handle('aiTrace:clear', () => {
    clearAiTraceEvents()
    return getAiTraceState()
  })

  ipcMain.handle('aiTrace:save', async () => {
    const list = getAiTraceEventsForExport()
    if (!list.length) return { ok: false as const, error: 'No trace events to save' }
    const dir = path.join(app.getPath('userData'), 'ai-traces')
    await fs.mkdir(dir, { recursive: true })
    const filePath = path.join(dir, `trace-${Date.now()}.jsonl`)
    const body = list.map((row) => JSON.stringify(row)).join('\n') + '\n'
    await fs.writeFile(filePath, body, 'utf8')
    return { ok: true as const, path: filePath }
  })
}

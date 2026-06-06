import { ipcMain } from 'electron'
import { broadcastToRenderers } from './renderer-broadcast'
import { getAiMetricsSnapshot, type AiMetricsFilter } from './ai-metrics-store'

let metricsTimer: ReturnType<typeof setInterval> | null = null

const tickMetrics = () => {
  broadcastToRenderers('aiMetrics:update', getAiMetricsSnapshot())
}

export const registerAiMetricsIpc = () => {
  ipcMain.handle('aiMetrics:getSnapshot', (_e, filter?: string | AiMetricsFilter) => {
    if (typeof filter === 'string') {
      const id = filter.trim()
      return getAiMetricsSnapshot(id || undefined)
    }
    if (filter && typeof filter === 'object') return getAiMetricsSnapshot(filter)
    return getAiMetricsSnapshot()
  })

  if (!metricsTimer) {
    metricsTimer = setInterval(tickMetrics, 1500)
  }
}

export const stopAiMetricsTimer = () => {
  if (metricsTimer) {
    clearInterval(metricsTimer)
    metricsTimer = null
  }
}

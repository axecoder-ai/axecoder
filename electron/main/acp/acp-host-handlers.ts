import type { AgentProgressPayload } from '../../../src/utils/agent-progress'

export type AcpHostHandlers = {
  onProgress?: (payload: AgentProgressPayload) => void
}

let handlers: AcpHostHandlers = {}

export const setAcpHostHandlers = (next: AcpHostHandlers): void => {
  handlers = next
}

export const resetAcpHostHandlersForTests = (): void => {
  handlers = {}
}

export const handleAcpHostRequest = async (method: string, params: unknown): Promise<unknown> => {
  if (method === 'emitProgress') {
    handlers.onProgress?.(params as AgentProgressPayload)
    return
  }
  if (method === 'notifyLspFileRefresh' || method === 'afterAgentFileWrite') {
    return ''
  }
  if (
    method === 'traceToolCall' ||
    method === 'traceToolResult' ||
    method === 'traceModelCall' ||
    method === 'aiMetricsBegin' ||
    method === 'aiMetricsFirstToken' ||
    method === 'aiMetricsStreamTick' ||
    method === 'aiMetricsEnd'
  ) {
    return
  }
  throw new Error(`Unknown ACP host method: ${method}`)
}

import type { AgentProgressPayload } from '../../../src/utils/agent-progress'

type HostRequestFn = (method: string, params: unknown) => Promise<void>

let hostRequestFn: HostRequestFn | null = null

export const isAgentWorkerProcess = (): boolean =>
  process.env.AXECODER_AGENT_WORKER === '1' || process.env.AXECODER_WORKSHOP_WORKER === '1'

export const setAgentWorkerHostRequest = (fn: HostRequestFn | null): void => {
  hostRequestFn = fn
}

export const requestMainProcess = async (method: string, params: unknown): Promise<void> => {
  if (!hostRequestFn) return
  await hostRequestFn(method, params)
}

export const delegateEmitAgentProgress = (payload: AgentProgressPayload): void => {
  if (isAgentWorkerProcess()) {
    void requestMainProcess('emitProgress', payload)
    return
  }
}

export const delegateNotifyLspFileRefresh = (filePath: string): void => {
  if (isAgentWorkerProcess()) {
    void requestMainProcess('notifyLspFileRefresh', filePath)
    return
  }
}

export const delegateTraceToolCall = (params: unknown): void => {
  if (isAgentWorkerProcess()) {
    void requestMainProcess('traceToolCall', params)
    return
  }
}

export const delegateTraceToolResult = (params: unknown): void => {
  if (isAgentWorkerProcess()) {
    void requestMainProcess('traceToolResult', params)
    return
  }
}

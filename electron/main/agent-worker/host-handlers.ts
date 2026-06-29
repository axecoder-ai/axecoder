import { broadcastToRenderers } from '../renderer-broadcast'
import { notifyLspFileRefresh } from '../lsp/lsp-editor-ipc'
import {
  beginAiMetricsCallWithId,
  endAiMetricsCall,
  markAiMetricsFirstToken,
  tickAiMetricsStream,
} from '../ai-metrics-store'
import { traceModelCall, traceToolCall, traceToolResult } from '../ai-trace-store'
import type { AgentProgressPayload } from '../../../src/utils/agent-progress'

type AiMetricsBeginParams = {
  callId: string
  input: Parameters<typeof beginAiMetricsCallWithId>[1]
}

type AiMetricsEndParams = {
  callId: string
  input: Parameters<typeof endAiMetricsCall>[1]
  meta: Parameters<typeof endAiMetricsCall>[2]
}

export const handleAgentWorkerHostRequest = async (
  method: string,
  params: unknown,
): Promise<void> => {
  switch (method) {
    case 'emitProgress':
      broadcastToRenderers('agent:progress', params as AgentProgressPayload)
      return
    case 'notifyLspFileRefresh':
      notifyLspFileRefresh(String(params ?? ''))
      return
    case 'traceToolCall':
      traceToolCall(params as Parameters<typeof traceToolCall>[0])
      return
    case 'traceToolResult':
      traceToolResult(params as Parameters<typeof traceToolResult>[0])
      return
    case 'traceModelCall':
      traceModelCall(params as Parameters<typeof traceModelCall>[0])
      return
    case 'aiMetricsBegin': {
      const p = params as AiMetricsBeginParams
      beginAiMetricsCallWithId(p.callId, p.input)
      return
    }
    case 'aiMetricsFirstToken':
      markAiMetricsFirstToken((params as { callId: string }).callId)
      return
    case 'aiMetricsStreamTick': {
      const p = params as { callId: string; deltaChars: number }
      tickAiMetricsStream(p.callId, p.deltaChars)
      return
    }
    case 'aiMetricsEnd': {
      const p = params as AiMetricsEndParams
      endAiMetricsCall(p.callId, p.input, p.meta)
      return
    }
    default:
      throw new Error(`Unknown agent worker host method: ${method}`)
  }
}

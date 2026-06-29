import { isAgentWorkerProcess, requestMainProcess } from './agent/main-process-delegate'
import {
  beginAiMetricsCallWithId,
  createAiMetricsCallId,
  endAiMetricsCall as endAiMetricsCallMain,
  markAiMetricsFirstToken as markAiMetricsFirstTokenMain,
  tickAiMetricsStream as tickAiMetricsStreamMain,
  type AiMetricsSource,
} from './ai-metrics-store'

export const beginAiMetricsCall = (input: {
  modelId: string
  modelName: string
  provider: string
  source: AiMetricsSource
}): string => {
  const callId = createAiMetricsCallId()
  if (isAgentWorkerProcess()) {
    void requestMainProcess('aiMetricsBegin', { callId, input })
    return callId
  }
  beginAiMetricsCallWithId(callId, input)
  return callId
}

export const markAiMetricsFirstToken = (callId: string) => {
  if (isAgentWorkerProcess()) {
    void requestMainProcess('aiMetricsFirstToken', { callId })
    return
  }
  markAiMetricsFirstTokenMain(callId)
}

export const tickAiMetricsStream = (callId: string, deltaChars: number) => {
  if (isAgentWorkerProcess()) {
    void requestMainProcess('aiMetricsStreamTick', { callId, deltaChars })
    return
  }
  tickAiMetricsStreamMain(callId, deltaChars)
}

export const endAiMetricsCall = (
  callId: string,
  input: {
    ok: boolean
    error?: string
    outputChars?: number
    inputTokens?: number
    outputTokens?: number
    tokensEstimated?: boolean
  },
  meta: {
    modelId: string
    modelName: string
    provider: string
    source: AiMetricsSource
  },
) => {
  if (isAgentWorkerProcess()) {
    void requestMainProcess('aiMetricsEnd', { callId, input, meta })
    return
  }
  endAiMetricsCallMain(callId, input, meta)
}

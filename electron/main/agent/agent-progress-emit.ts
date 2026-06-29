import type { AgentProgressPayload } from '../../../src/utils/agent-progress'
import { delegateEmitAgentProgress, isAgentWorkerProcess } from './main-process-delegate'
import { broadcastToRenderers } from '../renderer-broadcast'

export const emitAgentProgress = (payload: AgentProgressPayload) => {
  if (isAgentWorkerProcess()) {
    delegateEmitAgentProgress(payload)
    return
  }
  broadcastToRenderers('agent:progress', payload)
}

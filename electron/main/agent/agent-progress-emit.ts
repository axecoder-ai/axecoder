import type { AgentProgressPayload } from '../../../src/utils/agent-progress'
import { broadcastToRenderers } from '../renderer-broadcast'

export const emitAgentProgress = (payload: AgentProgressPayload) => {
  broadcastToRenderers('agent:progress', payload)
}

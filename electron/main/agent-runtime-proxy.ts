import type { AgentWorkerBridge } from './agent-worker-bridge'
import { getAgentWorkerBridge } from './agent-worker-bridge'

export const withAgentRuntime = async <T>(
  local: () => Promise<T> | T,
  remote: (bridge: AgentWorkerBridge) => Promise<T>,
): Promise<T> => {
  const bridge = await getAgentWorkerBridge()
  if (!bridge) return await local()
  return remote(bridge)
}

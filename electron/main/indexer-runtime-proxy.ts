import type { IndexerWorkerBridge } from './indexer-worker-bridge'
import { getIndexerWorkerBridge } from './indexer-worker-bridge'

export const withIndexerRuntime = async <T>(
  local: () => Promise<T> | T,
  remote: (bridge: IndexerWorkerBridge) => Promise<T>,
): Promise<T> => {
  const bridge = await getIndexerWorkerBridge()
  if (!bridge) return await local()
  return remote(bridge)
}

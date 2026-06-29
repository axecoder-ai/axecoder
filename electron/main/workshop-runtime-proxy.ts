import type { WorkshopWorkerBridge } from './workshop-worker-bridge'
import { disableWorkshopWorkerBridge, getWorkshopWorkerBridge } from './workshop-worker-bridge'

const isWorkerUnavailableError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    msg.includes('Workshop worker exited') ||
    msg.includes('Workshop worker not found') ||
    msg.includes('Workshop worker stdin unavailable')
  )
}

export const withWorkshopRuntime = async <T>(
  local: () => Promise<T> | T,
  remote: (bridge: WorkshopWorkerBridge) => Promise<T>,
): Promise<T> => {
  const bridge = await getWorkshopWorkerBridge()
  if (!bridge) return await local()
  try {
    return await remote(bridge)
  } catch (err) {
    if (!isWorkerUnavailableError(err)) throw err
    disableWorkshopWorkerBridge()
    return await local()
  }
}

import { emitWorkshopProgress } from '../workshop/workshop-progress-emit'
import { handleAgentWorkerHostRequest } from '../agent-worker/host-handlers'
import type { WorkshopProgressPayload } from '../workshop/workshop-types'

export const handleWorkshopWorkerHostRequest = async (
  method: string,
  params: unknown,
): Promise<void> => {
  if (method === 'emitWorkshopProgress') {
    emitWorkshopProgress(params as WorkshopProgressPayload)
    return
  }
  await handleAgentWorkerHostRequest(method, params)
}

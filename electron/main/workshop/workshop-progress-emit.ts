import type { WorkshopProgressPayload } from './workshop-types'
import { broadcastToRenderers } from '../renderer-broadcast'
import { requestMainProcess, isWorkshopWorkerProcess } from '../workshop-worker/main-process-delegate'

export const emitWorkshopProgress = (payload: WorkshopProgressPayload) => {
  broadcastToRenderers('workshop:progress', payload)
}

export const delegateEmitWorkshopProgress = (payload: WorkshopProgressPayload): void => {
  if (isWorkshopWorkerProcess()) {
    void requestMainProcess('emitWorkshopProgress', payload)
    return
  }
  emitWorkshopProgress(payload)
}

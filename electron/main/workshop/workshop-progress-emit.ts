import type { WorkshopProgressPayload } from './workshop-types'
import { broadcastToRenderers } from '../renderer-broadcast'

export const emitWorkshopProgress = (payload: WorkshopProgressPayload) => {
  broadcastToRenderers('workshop:progress', payload)
}

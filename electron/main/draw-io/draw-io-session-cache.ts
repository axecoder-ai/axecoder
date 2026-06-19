import type { WorkshopSession } from '../workshop/workshop-types'

const cache = new Map<string, WorkshopSession>()

export const bindDrawIoWorkshopSession = (session: WorkshopSession) => {
  cache.set(session.id, session)
}

export const getDrawIoWorkshopSession = (workshopId: string): WorkshopSession | undefined =>
  cache.get(workshopId)

export const clearDrawIoWorkshopSession = (workshopId: string) => {
  cache.delete(workshopId)
}

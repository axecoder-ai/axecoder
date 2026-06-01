import type { WorkshopRoleId } from './workshop-types'

const WORKSHOP_STREAM_PREFIX = 'workshop-'

export const buildWorkshopStreamId = (
  workshopId: string,
  roleId: Exclude<WorkshopRoleId, 'system' | 'user'>,
): string => `${WORKSHOP_STREAM_PREFIX}${workshopId.trim()}-${roleId}`

export const parseWorkshopStreamId = (
  streamId: string,
): { workshopId: string; roleId: string } | null => {
  const id = streamId.trim()
  if (!id.startsWith(WORKSHOP_STREAM_PREFIX)) return null
  const rest = id.slice(WORKSHOP_STREAM_PREFIX.length)
  const dash = rest.lastIndexOf('-')
  if (dash <= 0) return null
  return {
    workshopId: rest.slice(0, dash),
    roleId: rest.slice(dash + 1),
  }
}

export const isWorkshopStreamId = (streamId: string) =>
  streamId.trim().startsWith(WORKSHOP_STREAM_PREFIX)

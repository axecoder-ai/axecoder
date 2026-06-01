const WORKSHOP_STREAM_PREFIX = 'workshop-'

export const workshopStreamPrefix = (workshopId: string) =>
  `${WORKSHOP_STREAM_PREFIX}${workshopId.trim()}-`

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

export const parseWorkshopStreamRole = (
  streamId: string,
  workshopId: string,
): string | null => {
  const parsed = parseWorkshopStreamId(streamId)
  if (!parsed || parsed.workshopId !== workshopId.trim()) return null
  return parsed.roleId || null
}

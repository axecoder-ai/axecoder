type HostRequestFn = (method: string, params: unknown) => Promise<void>

let hostRequestFn: HostRequestFn | null = null

export const isWorkshopWorkerProcess = (): boolean =>
  process.env.AXECODER_WORKSHOP_WORKER === '1'

export const setWorkshopWorkerHostRequest = (fn: HostRequestFn | null): void => {
  hostRequestFn = fn
}

export const requestMainProcess = async (method: string, params: unknown): Promise<void> => {
  if (!hostRequestFn) return
  await hostRequestFn(method, params)
}

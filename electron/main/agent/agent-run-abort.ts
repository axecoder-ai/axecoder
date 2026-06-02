const controllersBySession = new Map<string, AbortController>()

export const bindAgentRunAbort = (sessionId: string) => {
  const prev = controllersBySession.get(sessionId)
  if (prev) prev.abort()
  const ac = new AbortController()
  controllersBySession.set(sessionId, ac)
  return ac
}

export const getAgentRunAbortSignal = (sessionId: string) =>
  controllersBySession.get(sessionId)?.signal

export const abortAgentRun = (sessionId: string) => {
  controllersBySession.get(sessionId)?.abort()
}

export const clearAgentRunAbort = (sessionId: string) => {
  controllersBySession.delete(sessionId)
}

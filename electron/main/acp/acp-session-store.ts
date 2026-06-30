export type AcpSessionState = {
  acpSessionId: string
  projectRoot: string
  cwd: string
  messages: { role: 'user' | 'assistant'; content: string }[]
  agentSessionId?: string
  abortController: AbortController | null
}

const sessions = new Map<string, AcpSessionState>()

export const createAcpSession = (acpSessionId: string, cwd: string): AcpSessionState => {
  const projectRoot = cwd.trim() || process.cwd()
  const state: AcpSessionState = {
    acpSessionId,
    projectRoot,
    cwd: projectRoot,
    messages: [],
    abortController: null,
  }
  sessions.set(acpSessionId, state)
  return state
}

export const getAcpSession = (id: string): AcpSessionState | undefined => sessions.get(id)

export const deleteAcpSession = (id: string): void => {
  sessions.delete(id)
}

export const resetAcpSessionsForTests = (): void => {
  sessions.clear()
}

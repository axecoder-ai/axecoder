export type AgentWorkerRequest = {
  type: 'req'
  id: number
  method: string
  params?: unknown
}

export type AgentWorkerResponse = {
  type: 'res'
  id: number
  ok: boolean
  result?: unknown
  error?: string
}

export type AgentWorkerNotify = {
  type: 'notify'
  channel: string
  payload?: unknown
}

export type AgentWorkerHostRequest = {
  type: 'host'
  id: number
  method: string
  params?: unknown
}

export type AgentWorkerHostResponse = {
  type: 'hostRes'
  id: number
  ok: boolean
  result?: unknown
  error?: string
}

export type AgentWorkerLine =
  | AgentWorkerRequest
  | AgentWorkerResponse
  | AgentWorkerNotify
  | AgentWorkerHostRequest
  | AgentWorkerHostResponse

export const parseAgentWorkerLine = (line: string): AgentWorkerLine | null => {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    const msg = JSON.parse(trimmed) as AgentWorkerLine
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return null
    if (
      msg.type !== 'req' &&
      msg.type !== 'res' &&
      msg.type !== 'notify' &&
      msg.type !== 'host' &&
      msg.type !== 'hostRes'
    ) {
      return null
    }
    return msg
  } catch {
    return null
  }
}

export const serializeAgentWorkerLine = (msg: AgentWorkerLine): string => `${JSON.stringify(msg)}\n`

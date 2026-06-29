export type ExtensionHostRequest = {
  type: 'req'
  id: number
  method: string
  params?: unknown
}

export type ExtensionHostResponse = {
  type: 'res'
  id: number
  ok: boolean
  result?: unknown
  error?: string
}

export type ExtensionHostNotify = {
  type: 'notify'
  channel: string
  payload?: unknown
}

export type ExtensionHostLine = ExtensionHostRequest | ExtensionHostResponse | ExtensionHostNotify

export const parseExtensionHostLine = (line: string): ExtensionHostLine | null => {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    const msg = JSON.parse(trimmed) as ExtensionHostLine
    if (!msg || typeof msg !== 'object' || !('type' in msg)) return null
    if (msg.type !== 'req' && msg.type !== 'res' && msg.type !== 'notify') return null
    return msg
  } catch {
    return null
  }
}

export const serializeExtensionHostLine = (msg: ExtensionHostLine): string => `${JSON.stringify(msg)}\n`

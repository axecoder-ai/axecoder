const MAX_LINES = 500
const channels = new Map<string, string[]>()

export const appendOutput = (channel: string, line: string) => {
  const name = channel.trim() || 'AxeCoder'
  const cur = channels.get(name) ?? []
  channels.set(name, [...cur.slice(-(MAX_LINES - 1)), line])
}

export const clearOutput = (channel: string) => {
  channels.set(channel.trim() || 'AxeCoder', [])
}

export const listOutputChannels = (): string[] => {
  if (!channels.size) return ['AxeCoder']
  return [...channels.keys()]
}

export const getOutputLines = (channel: string): string[] => {
  return channels.get(channel.trim() || 'AxeCoder') ?? []
}

export const logOutput = (channel: string, msg: string) => {
  const ts = new Date().toISOString().slice(11, 19)
  appendOutput(channel, `[${ts}] ${msg}`)
}

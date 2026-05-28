export type ParsedSlashCommand = {
  commandName: string
  args: string
}

export function parseSlashCommand(input: string): ParsedSlashCommand | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) return null
  const withoutSlash = trimmed.slice(1).trim()
  if (!withoutSlash) return null
  const space = withoutSlash.indexOf(' ')
  if (space === -1) {
    return { commandName: withoutSlash.toLowerCase(), args: '' }
  }
  const commandName = withoutSlash.slice(0, space).toLowerCase()
  const args = withoutSlash.slice(space + 1).trim()
  if (!commandName) return null
  return { commandName, args }
}

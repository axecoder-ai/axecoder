import type { SlashCommandDef } from './types'
import { registerBuiltinSlashCommands } from './builtin'
import { allCommands, setSlashCommands } from './registry-core'

setSlashCommands(registerBuiltinSlashCommands())

export { refreshSlashCommandRegistry } from './registry-refresh'

export function allSlashCommands(): SlashCommandDef[] {
  return allCommands()
}

export function findCommand(name: string): SlashCommandDef | undefined {
  const key = name.toLowerCase()
  for (const c of allCommands()) {
    if (c.name === key) return c
    if (c.aliases?.some((a) => a.toLowerCase() === key)) return c
  }
  return undefined
}

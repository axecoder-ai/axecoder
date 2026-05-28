import type { SlashCommandDef } from './types'
import initCmd from './init/index'

const COMMANDS: SlashCommandDef[] = [initCmd]

export function allCommands(): SlashCommandDef[] {
  return COMMANDS
}

export function findCommand(name: string): SlashCommandDef | undefined {
  const key = name.toLowerCase()
  for (const c of COMMANDS) {
    if (c.name === key) return c
    if (c.aliases?.some((a) => a.toLowerCase() === key)) return c
  }
  return undefined
}

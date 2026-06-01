import type { SlashCommandDef } from './types'

const COMMANDS: SlashCommandDef[] = []

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

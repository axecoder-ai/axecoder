import type { SlashCommandDef } from './types'

let commands: SlashCommandDef[] = []

export const setSlashCommands = (defs: SlashCommandDef[]) => {
  commands = defs
}

export const allCommands = (): SlashCommandDef[] => commands

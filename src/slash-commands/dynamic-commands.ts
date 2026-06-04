import type { SlashCommandDef } from './types'

export type CustomCommandMeta = {
  name: string
  path: string
  description: string
  source: string
}

type CustomRunOutcome =
  | { ok: true; message: string; sendPrompt: string }
  | { ok: false; message: string }

export const buildCustomSlashCommands = (
  commands: CustomCommandMeta[],
  runCustom: (commandName: string, args: string) => Promise<CustomRunOutcome>,
  reservedNames: Set<string>,
): SlashCommandDef[] => {
  const out: SlashCommandDef[] = []
  for (const c of commands) {
    const key = c.name.toLowerCase()
    if (reservedNames.has(key)) continue
    reservedNames.add(key)
    out.push({
      name: key,
      description: `Custom: ${c.description}（${c.source}）`,
      run: async (_ctx, args) => {
        const res = await runCustom(c.name, args)
        if (!res.ok) return { ok: false, message: res.message }
        return {
          ok: true,
          message: res.message,
          silent: true,
          sendPrompt: res.sendPrompt,
        }
      },
    })
  }
  return out
}

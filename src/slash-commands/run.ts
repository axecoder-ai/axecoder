import { parseSlashCommand } from './parse'
import { findCommand } from './registry'
import './registry'
import type { SlashContext, SlashRunResult } from './types'

export async function runSlashCommand(
  input: string,
  ctx: SlashContext,
): Promise<SlashRunResult | null> {
  const parsed = parseSlashCommand(input)
  if (!parsed) return null
  const def = findCommand(parsed.commandName)
  if (!def) {
    return { ok: false, message: '未知命令。' }
  }
  return def.run(ctx, parsed.args)
}

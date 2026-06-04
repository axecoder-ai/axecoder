import fs from 'node:fs/promises'
import path from 'node:path'
import { descriptionFromMarkdown } from './agent-custom-commands'

export type BuiltinCommandMeta = {
  name: string
  path: string
  description: string
}

const BUILTIN_COMMAND_NAMES = [
  'research-codebase',
  'make-proposals',
  'make-plan',
  'clarify',
  'create-proposals',
  'create-plan',
  'implement',
  'code-review',
  'design_doc_template',
  'rppit',
  'summary',
] as const

const builtinCommandsDir = () =>
  path.join(process.env.APP_ROOT ?? path.resolve(import.meta.dirname, '../../..'), 'resources/builtin-commands')

export const listBuiltinCommands = async (): Promise<BuiltinCommandMeta[]> => {
  const dir = builtinCommandsDir()
  const out: BuiltinCommandMeta[] = []
  for (const name of BUILTIN_COMMAND_NAMES) {
    const filePath = path.join(dir, `${name}.md`)
    let raw = ''
    try {
      raw = await fs.readFile(filePath, 'utf-8')
    } catch {
      continue
    }
    out.push({
      name,
      path: filePath,
      description: descriptionFromMarkdown(raw, `Built-in command (${name})`),
    })
  }
  return out
}

export const loadBuiltinCommand = async (name: string) => {
  const key = name.trim().toLowerCase()
  if (!BUILTIN_COMMAND_NAMES.includes(key as (typeof BUILTIN_COMMAND_NAMES)[number])) {
    return { ok: false as const, error: `Built-in command not found: ${name}` }
  }
  const filePath = path.join(builtinCommandsDir(), `${key}.md`)
  try {
    const text = (await fs.readFile(filePath, 'utf-8')).trim()
    return { ok: true as const, name: key, text, path: filePath }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}

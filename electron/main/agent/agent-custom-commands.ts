import fs from 'node:fs/promises'
import path from 'node:path'
import { axecoderPath } from '../axecoder-dir'

export type DiscoveredCustomCommand = {
  name: string
  path: string
  description: string
  source: 'user' | 'project'
}

const slugFromFile = (fileName: string) =>
  fileName.replace(/\.md$/i, '').replace(/\s+/g, '-').toLowerCase()

export const descriptionFromMarkdown = (raw: string, fallback: string) => {
  let body = raw.trim()
  if (body.startsWith('---')) {
    const end = body.indexOf('---', 3)
    if (end > 0) {
      const fm = body.slice(3, end).trim()
      body = body.slice(end + 3).trim()
      for (const line of fm.split('\n')) {
        const m = line.match(/^description:\s*(.+)$/i)
        if (m) return m[1].trim()
      }
    }
  }
  const title = body.match(/^#\s+(.+)$/m)
  if (title) return title[1].trim()
  const first = body.split('\n').find((l) => l.trim())
  if (first && first.length <= 120) return first.replace(/^#+\s*/, '').trim()
  return fallback
}

const scanCommandsDir = async (
  dir: string,
  source: DiscoveredCustomCommand['source'],
  out: Map<string, DiscoveredCustomCommand>,
) => {
  let entries: { name: string; isFile: () => boolean }[] = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.toLowerCase().endsWith('.md')) continue
    const name = slugFromFile(ent.name)
    if (!name) continue
    const filePath = path.join(dir, ent.name)
    let raw = ''
    try {
      raw = await fs.readFile(filePath, 'utf-8')
    } catch {
      continue
    }
    out.set(name, {
      name,
      path: filePath,
      description: descriptionFromMarkdown(raw, `自定义命令（${name}）`),
      source,
    })
  }
}

export const discoverCustomCommands = async (
  projectRoot: string,
): Promise<DiscoveredCustomCommand[]> => {
  const byName = new Map<string, DiscoveredCustomCommand>()
  await scanCommandsDir(axecoderPath('commands'), 'user', byName)
  if (projectRoot) {
    await scanCommandsDir(path.join(projectRoot, '.axecoder', 'commands'), 'project', byName)
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const findCustomCommandByName = async (projectRoot: string, name: string) => {
  const key = name.trim().toLowerCase()
  const all = await discoverCustomCommands(projectRoot)
  return all.find((c) => c.name === key) ?? null
}

export const readCustomCommandContent = async (commandPath: string) => {
  try {
    const text = await fs.readFile(commandPath, 'utf-8')
    return { ok: true as const, text: text.trim() }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}

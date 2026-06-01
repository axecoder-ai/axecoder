import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { axecoderPath } from '../axecoder-dir'
import type { AgentOutputStyleConfig } from './agent-output-styles'

export type CustomOutputStyleMeta = {
  id: string
  name: string
  description: string
  source: 'user' | 'claude' | 'project'
}

const STYLE_DIRS = (projectRoot?: string) => {
  const dirs: { dir: string; source: CustomOutputStyleMeta['source'] }[] = [
    { dir: axecoderPath('output-styles'), source: 'user' },
    { dir: path.join(os.homedir(), '.claude', 'output-styles'), source: 'claude' },
  ]
  if (projectRoot) {
    dirs.push({
      dir: path.join(projectRoot, '.axecoder', 'output-styles'),
      source: 'project',
    })
  }
  return dirs
}

const slugFromFile = (fileName: string) =>
  fileName.replace(/\.md$/i, '').replace(/\s+/g, '-').toLowerCase()

const parseStyleMarkdown = (
  raw: string,
  id: string,
): { name: string; description: string; prompt: string; keepCodingInstructions?: boolean } => {
  let body = raw.trim()
  let name = id
  let description = `Custom output style (${id})`
  let keepCodingInstructions = true

  if (body.startsWith('---')) {
    const end = body.indexOf('---', 3)
    if (end > 0) {
      const fm = body.slice(3, end).trim()
      body = body.slice(end + 3).trim()
      for (const line of fm.split('\n')) {
        const m = line.match(/^(\w+):\s*(.+)$/)
        if (!m) continue
        const key = m[1].toLowerCase()
        const val = m[2].trim()
        if (key === 'name') name = val
        if (key === 'description') description = val
        if (key === 'keepcodinginstructions') keepCodingInstructions = val !== 'false'
      }
    }
  }

  const title = body.match(/^#\s+(.+)$/m)
  if (title && name === id) name = title[1].trim()

  return { name, description, prompt: body, keepCodingInstructions }
}

export const loadCustomOutputStyles = async (
  projectRoot?: string,
): Promise<{ styles: Record<string, AgentOutputStyleConfig>; metas: CustomOutputStyleMeta[] }> => {
  const styles: Record<string, AgentOutputStyleConfig> = {}
  const metas: CustomOutputStyleMeta[] = []
  const seen = new Set<string>()

  for (const { dir, source } of STYLE_DIRS(projectRoot)) {
    let entries: string[] = []
    try {
      entries = await fs.readdir(dir)
    } catch {
      continue
    }
    for (const file of entries) {
      if (!file.endsWith('.md')) continue
      const id = slugFromFile(file)
      if (seen.has(id)) continue
      seen.add(id)
      try {
        const raw = await fs.readFile(path.join(dir, file), 'utf-8')
        const parsed = parseStyleMarkdown(raw, id)
        styles[id] = {
          name: parsed.name || id,
          description: parsed.description,
          prompt: parsed.prompt,
          keepCodingInstructions: parsed.keepCodingInstructions,
        }
        metas.push({
          id,
          name: parsed.name,
          description: parsed.description,
          source,
        })
      } catch {
        // skip broken file
      }
    }
  }

  return { styles, metas }
}

let cachedStyles: Record<string, AgentOutputStyleConfig> = {}
let cachedMetas: CustomOutputStyleMeta[] = []

export const refreshCustomOutputStylesCache = async (projectRoot?: string) => {
  const loaded = await loadCustomOutputStyles(projectRoot)
  cachedStyles = loaded.styles
  cachedMetas = loaded.metas
  return loaded
}

export const getCachedCustomOutputStyles = () => ({
  styles: cachedStyles,
  metas: cachedMetas,
})

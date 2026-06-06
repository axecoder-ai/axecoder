import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { rgPath } from '@vscode/ripgrep'
import { isPathInsideRoot, parseRipgrepJsonLine, type SearchHit } from './fs-utils'
import { runRipgrepFiles } from './rg-files'

export type SearchOptions = {
  caseSensitive?: boolean
  wholeWord?: boolean
  regex?: boolean
  include?: string
  exclude?: string
}

const DEFAULT_IGNORE_GLOBS = [
  '!node_modules/**',
  '!.git/**',
  '!dist/**',
  '!dist-electron/**',
  '!release/**',
  '!vscode/**',
  '!opencode/**',
  '!claude-code/**',
  '!**/*.asar',
]

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** 构建 ripgrep 参数（可单测） */
export const buildRipgrepArgs = (rootPath: string, query: string, opts: SearchOptions = {}): string[] => {
  const args = ['--json', '-n']
  for (const g of DEFAULT_IGNORE_GLOBS) args.push('--glob', g)
  if (opts.include?.trim()) {
    args.push('--glob', opts.include.trim())
  }
  if (opts.exclude?.trim()) {
    args.push('--glob', `!${opts.exclude.trim()}`)
  }
  if (!opts.caseSensitive) args.push('-i')
  if (opts.wholeWord) args.push('-w')
  if (!opts.regex) args.push('-F')
  args.push(query, rootPath)
  return args
}

export const runRipgrepSearch = (
  rootPath: string,
  query: string,
  opts: SearchOptions = {},
): Promise<SearchHit[]> => {
  return new Promise((resolve, reject) => {
    const hits: SearchHit[] = []
    const args = buildRipgrepArgs(rootPath, query, opts)
    const proc = spawn(rgPath, args, { cwd: rootPath })
    let buf = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const hit = parseRipgrepJsonLine(line)
        if (hit && isPathInsideRoot(rootPath, hit.file)) hits.push(hit)
      }
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (buf.trim()) {
        const hit = parseRipgrepJsonLine(buf)
        if (hit && isPathInsideRoot(rootPath, hit.file)) hits.push(hit)
      }
      if (code === 0 || code === 1) resolve(hits.slice(0, 500))
      else reject(new Error(`Search failed (code ${code})`))
    })
  })
}

/** 单行替换（可单测） */
export const replaceInLine = (
  line: string,
  query: string,
  replacement: string,
  opts: SearchOptions = {},
): string => {
  if (!query) return line
  let pattern = opts.regex ? query : escapeRegex(query)
  if (opts.wholeWord) pattern = `\\b${pattern}\\b`
  const flags = opts.caseSensitive ? 'g' : 'gi'
  try {
    return line.replace(new RegExp(pattern, flags), replacement)
  } catch {
    return line
  }
}

export const countReplacementsInLine = (
  line: string,
  query: string,
  replacement: string,
  opts: SearchOptions = {},
): number => {
  if (!query) return 0
  let pattern = opts.regex ? query : escapeRegex(query)
  if (opts.wholeWord) pattern = `\\b${pattern}\\b`
  const flags = opts.caseSensitive ? 'g' : 'gi'
  try {
    const re = new RegExp(pattern, flags)
    const matches = line.match(re)
    return matches ? matches.length : 0
  } catch {
    return 0
  }
}

export type ReplaceResult = { files: number; replacements: number }

export const replaceInProject = async (
  rootPath: string,
  query: string,
  replacement: string,
  opts: SearchOptions = {},
): Promise<ReplaceResult> => {
  const hits = await runRipgrepSearch(rootPath, query, opts)
  const fileSet = new Set(hits.map((h) => h.file))
  let files = 0
  let replacements = 0
  for (const file of fileSet) {
    const content = await fs.readFile(file, 'utf-8')
    const lines = content.split('\n')
    let fileChanged = false
    for (let i = 0; i < lines.length; i++) {
      const n = countReplacementsInLine(lines[i], query, replacement, opts)
      if (n > 0) {
        lines[i] = replaceInLine(lines[i], query, replacement, opts)
        replacements += n
        fileChanged = true
      }
    }
    if (fileChanged) {
      await fs.writeFile(file, lines.join('\n'), 'utf-8')
      files += 1
    }
  }
  return { files, replacements }
}

const LIST_FILES_MAX = 5000

export const listProjectFiles = async (rootPath: string): Promise<string[]> => {
  const abs = await runRipgrepFiles(rootPath, '**/*')
  const rel = abs
    .map((f) => {
      const norm = path.normalize(f)
      if (norm.startsWith(rootPath)) {
        return norm.slice(rootPath.length).replace(/^[/\\]+/, '')
      }
      return norm
    })
    .filter(Boolean)
  return rel.slice(0, LIST_FILES_MAX)
}

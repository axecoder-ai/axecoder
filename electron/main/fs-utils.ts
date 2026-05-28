import path from 'node:path'

export type ConflictAction = 'skip' | 'rename' | 'replace'

export const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  'dist',
  'dist-electron',
  '.DS_Store',
])

export const fileNameFromPath = (p: string) => {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i >= 0 ? p.slice(i + 1) : p
}

export const isPathInsideRoot = (rootPath: string, targetPath: string) => {
  const root = path.resolve(rootPath)
  const target = path.resolve(targetPath)
  return target === root || target.startsWith(root + path.sep)
}

/** 目标已存在时按序号生成新路径，如 file (1).md */
export const destPathWithSuffix = (destPath: string, suffix: number) => {
  const dir = path.dirname(destPath)
  const ext = path.extname(destPath)
  const base = path.basename(destPath, ext)
  return path.join(dir, `${base} (${suffix})${ext}`)
}

export type SearchHit = {
  file: string
  line: number
  col: number
  text: string
}

/** 解析 ripgrep --json 行 */
export const parseRipgrepJsonLine = (line: string): SearchHit | null => {
  const trimmed = line.trim()
  if (!trimmed) return null
  let row: { type?: string; data?: { path?: { text?: string }; line_number?: number; submatches?: { start?: number; lines?: { text?: string } }[] } }
  try {
    row = JSON.parse(trimmed)
  } catch {
    return null
  }
  if (row.type !== 'match' || !row.data?.path?.text) return null
  const file = row.data.path.text
  const lineNo = row.data.line_number ?? 1
  const sub = row.data.submatches?.[0]
  const col = (sub?.start ?? 0) + 1
  const text = (sub?.lines?.text ?? '').replace(/\r?\n$/, '')
  return { file, line: lineNo, col, text }
}

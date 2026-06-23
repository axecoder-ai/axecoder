import path from 'node:path'

export type ConflictAction = 'skip' | 'rename' | 'replace'

export const IGNORED_DIR_NAMES = new Set([
  'node_modules',
  '.git',
  '.codegraph',
  '.understand-anything',
  'dist',
  'dist-electron',
  'release',
  // 项目根目录参考仓库符号链接（勿递归进入）
  'vscode',
  'opencode',
  'claude-code',
  '.DS_Store',
])

/** chokidar 用 glob，在 readdirp stat 之前跳过 asar / 参考仓库 */
export const WORKSPACE_WATCH_IGNORED_GLOBS = [
  '**/*.asar',
  '**/*.app/**',
  '**/node_modules/**',
  '**/.git/**',
  '**/release/**',
  '**/vscode/**',
  '**/opencode/**',
  '**/claude-code/**',
]

/** chokidar / 资源树：跳过打包产物与 asar/app 包，避免 Invalid package 崩溃 */
export const shouldIgnoreWorkspacePath = (p: string): boolean => {
  const parts = p.split(/[/\\]/)
  for (const part of parts) {
    if (IGNORED_DIR_NAMES.has(part)) return true
    if (part.endsWith('.asar')) return true
    if (part.endsWith('.app')) return true
  }
  return false
}

export const fileNameFromPath = (p: string) => {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i >= 0 ? p.slice(i + 1) : p
}

export const isPathInsideRoot = (rootPath: string, targetPath: string) => {
  const root = path.resolve(rootPath)
  const target = path.resolve(targetPath)
  return target === root || target.startsWith(root + path.sep)
}

/** When target exists按序号生成新路径，如 file (1).md */
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
  const lineText = row.data.lines?.text ?? sub?.lines?.text ?? ''
  const text = lineText.replace(/\r?\n$/, '')
  return { file, line: lineNo, col, text }
}

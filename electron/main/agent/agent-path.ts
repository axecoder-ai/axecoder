import path from 'node:path'
import { isPathInsideRoot } from '../fs-utils'

export const PATH_OUTSIDE_PROJECT_ERROR =
  'Path is outside project root; use a relative path under the opened project (e.g. README.md)'

/** 将已解析的绝对路径转为相对项目根的路径，便于日志展示 */
export const relativeInProject = (projectRoot: string, resolved: string): string => {
  const rel = path.relative(path.resolve(projectRoot), resolved)
  return rel && rel !== '' ? rel : '.'
}

/**
 * 仅允许落在 projectRoot 下的路径；项目外绝对路径、.. 穿越一律拒绝。
 */
export const resolvePathInProject = (projectRoot: string, filePath: string): string | null => {
  const root = path.resolve(projectRoot)
  const raw = filePath.trim()
  if (!raw || raw.includes('\0')) return null

  const resolved = path.isAbsolute(raw) ? path.resolve(raw) : path.resolve(root, raw)
  if (!isPathInsideRoot(root, resolved)) return null
  return resolved
}

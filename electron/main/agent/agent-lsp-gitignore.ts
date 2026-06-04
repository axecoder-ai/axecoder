import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import type { Location } from 'vscode-languageserver-types'

const execFileAsync = promisify(execFile)

const uriToFilePath = (uri: string): string => {
  let filePath = uri.replace(/^file:\/\//, '')
  if (/^\/[A-Za-z]:/.test(filePath)) filePath = filePath.slice(1)
  try {
    filePath = decodeURIComponent(filePath)
  } catch {
    /* keep */
  }
  return filePath
}

/** 过滤 gitignore 中的路径（对齐 CC LSPTool） */
export const filterGitIgnoredLocations = async <T extends Location>(
  locations: T[],
  cwd: string,
): Promise<T[]> => {
  if (locations.length === 0) return locations

  const uriToPath = new Map<string, string>()
  for (const loc of locations) {
    if (loc.uri && !uriToPath.has(loc.uri)) uriToPath.set(loc.uri, uriToFilePath(loc.uri))
  }

  const uniquePaths = [...new Set(uriToPath.values())]
  if (uniquePaths.length === 0) return locations

  const ignoredPaths = new Set<string>()
  const BATCH = 50
  for (let i = 0; i < uniquePaths.length; i += BATCH) {
    const batch = uniquePaths.slice(i, i + BATCH)
    try {
      const { stdout } = await execFileAsync('git', ['check-ignore', ...batch], {
        cwd,
        timeout: 5000,
      })
      for (const line of stdout.split('\n')) {
        const t = line.trim()
        if (t) ignoredPaths.add(t)
      }
    } catch {
      /* not a git repo or none ignored */
    }
  }

  if (ignoredPaths.size === 0) return locations

  return locations.filter((loc) => {
    const filePath = uriToPath.get(loc.uri)
    return !filePath || !ignoredPaths.has(filePath)
  })
}

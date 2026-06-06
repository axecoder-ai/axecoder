import fs from 'node:fs'
import path from 'node:path'
import type { SandboxMode } from './agent-sandbox-seatbelt'
import { getWritableRoots } from './agent-sandbox-seatbelt'

export const BWRAP_PATH = '/usr/bin/bwrap'

let bwrapAvailable: boolean | null = null

/** Linux bubblewrap 是否可用 */
export const isBwrapAvailable = (): boolean => {
  if (process.platform !== 'linux') return false
  if (bwrapAvailable !== null) return bwrapAvailable
  try {
    fs.accessSync(BWRAP_PATH, fs.constants.X_OK)
    bwrapAvailable = true
  } catch {
    bwrapAvailable = false
  }
  return bwrapAvailable
}

/** 构建 bwrap 参数（不含 bwrap 程序路径本身） */
export const createBwrapArgs = (
  innerProgram: string,
  innerArgs: string[],
  cwd: string,
  mode: SandboxMode = 'workspace-write',
): string[] => {
  const cwdCanon = path.resolve(cwd)
  const args: string[] = []

  args.push('--ro-bind', '/', '/')

  if (mode !== 'read-only') {
    const writableRoots = getWritableRoots(cwdCanon, mode)
    for (const root of writableRoots) {
      args.push('--bind', root.root, root.root)
    }
  }

  args.push('--chdir', cwdCanon)
  args.push('--unshare-all')
  args.push('--', innerProgram, ...innerArgs)
  return args
}

export const detectBwrapDenial = (exitCode: number | null, stderr: string): boolean => {
  if (exitCode === 0) return false
  const patterns = [
    /Permission denied/i,
    /Operation not permitted/i,
    /Read-only file system/i,
    /can't create/i,
    /cannot create/i,
  ]
  return patterns.some((p) => p.test(stderr))
}

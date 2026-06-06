import {
  SANDBOX_EXEC_PATH,
  createSeatbeltArgs,
  detectSeatbeltDenial,
  isSeatbeltAvailable,
  type SandboxMode,
} from './agent-sandbox-seatbelt'
import { BWRAP_PATH, createBwrapArgs, detectBwrapDenial, isBwrapAvailable } from './agent-sandbox-bwrap'

export type { SandboxMode } from './agent-sandbox-seatbelt'
export { getWritableRoots } from './agent-sandbox-seatbelt'

export type SandboxKind = 'seatbelt' | 'bwrap' | 'none'

export type ShellSpawnSpec = {
  program: string
  args: string[]
  sandboxed: boolean
  sandboxKind: SandboxKind
}

const buildUnsandboxedShell = (command: string): ShellSpawnSpec => {
  const isWin = process.platform === 'win32'
  const shell = isWin ? process.env.COMSPEC || 'cmd.exe' : process.env.SHELL || '/bin/sh'
  const shellArgs = isWin ? ['/d', '/s', '/c', command] : ['-lc', command]
  return { program: shell, args: shellArgs, sandboxed: false, sandboxKind: 'none' }
}

/** 构建 shell spawn 参数；按平台选择 Seatbelt / bwrap / 无沙箱 */
export const buildShellSpawnSpec = (
  projectRoot: string,
  command: string,
  opts?: { enabled?: boolean; mode?: SandboxMode },
): ShellSpawnSpec => {
  const enabled = opts?.enabled !== false
  const mode = opts?.mode ?? 'workspace-write'
  if (!enabled || mode === 'danger-full-access') {
    return buildUnsandboxedShell(command)
  }

  const unsandboxed = buildUnsandboxedShell(command)
  const { program: shell, args: shellArgs } = unsandboxed

  if (process.platform === 'darwin' && isSeatbeltAvailable()) {
    return {
      program: SANDBOX_EXEC_PATH,
      args: createSeatbeltArgs(shell, shellArgs, projectRoot, mode, false),
      sandboxed: true,
      sandboxKind: 'seatbelt',
    }
  }

  if (process.platform === 'linux' && isBwrapAvailable()) {
    return {
      program: BWRAP_PATH,
      args: createBwrapArgs(shell, shellArgs, projectRoot, mode),
      sandboxed: true,
      sandboxKind: 'bwrap',
    }
  }

  return unsandboxed
}

export const detectSandboxDenial = (
  exitCode: number | null,
  stderr: string,
  kind: SandboxKind = 'none',
): boolean => {
  if (kind === 'seatbelt') return detectSeatbeltDenial(exitCode, stderr)
  if (kind === 'bwrap') return detectBwrapDenial(exitCode, stderr)
  return detectSeatbeltDenial(exitCode, stderr) || detectBwrapDenial(exitCode, stderr)
}

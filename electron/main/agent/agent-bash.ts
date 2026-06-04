import { spawn } from 'node:child_process'

export const DEFAULT_BASH_TIMEOUT_MS = 120_000
export const MAX_BASH_TIMEOUT_MS = 600_000
const DEFAULT_TIMEOUT_MS = DEFAULT_BASH_TIMEOUT_MS
const MAX_OUTPUT_CHARS = 200_000

/** CC 参数 `timeout`（毫秒）；兼容旧 `timeout_ms` */
export const parseBashTimeoutMs = (args: Record<string, unknown>): number | undefined => {
  const raw = args.timeout ?? args.timeout_ms
  if (typeof raw !== 'number' || raw <= 0) return undefined
  return Math.min(raw, MAX_BASH_TIMEOUT_MS)
}

export const trimBashOutput = (text: string) => {
  if (text.length <= MAX_OUTPUT_CHARS) return text
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n...[output truncated]`
}

export const formatBackgroundBashStarted = (taskId: string, description?: string): string => {
  const lines = ['Background shell task started.', `Task id: ${taskId}`]
  if (description?.trim()) lines.push(`Description: ${description.trim()}`)
  lines.push('Use TaskOutput with task_id to read output while running or after completion.')
  return lines.join('\n')
}

/** 危险 git 命令（对齐 Claude Code Bash 约束） */
export const isDangerousGitCommand = (command: string) => {
  const c = command.toLowerCase()
  if (/\bgit\s+push\b/.test(c) && (/--force\b/.test(c) || /\s-f\b/.test(c) || /\s--force-with-lease\b/.test(c))) {
    return 'force push'
  }
  if (/\bgit\s+config\b/.test(c)) return 'git config'
  if (/\bgit\s+reset\s+--hard\b/.test(c)) return 'hard reset'
  return ''
}

const trimOutput = trimBashOutput

/** 在 projectRoot 下非交互执行 shell 命令（Agent Bash 工具） */
export const runAgentBash = async (
  projectRoot: string,
  command: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<
  | { ok: true; stdout: string; stderr: string; exitCode: number | null }
  | { ok: false; error: string }
> => {
  const cmd = command.trim()
  if (!cmd) return { ok: false, error: 'command is required' }
  if (!projectRoot.trim()) return { ok: false, error: 'project root is required' }
  const gitRisk = isDangerousGitCommand(cmd)
  if (gitRisk) {
    return {
      ok: false,
      error: `Rejected dangerous git operation (${gitRisk}). Do not run without explicit user approval.`,
    }
  }

  return new Promise((resolve) => {
    const isWin = process.platform === 'win32'
    const shell = isWin ? process.env.COMSPEC || 'cmd.exe' : process.env.SHELL || '/bin/sh'
    const shellArgs = isWin ? ['/d', '/s', '/c', cmd] : ['-lc', cmd]

    const proc = spawn(shell, shellArgs, {
      cwd: projectRoot,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let settled = false

    const finish = (
      result:
        | { ok: true; stdout: string; stderr: string; exitCode: number | null }
        | { ok: false; error: string },
    ) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(result)
    }

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      finish({
        ok: false,
        error: `Command timed out after ${timeoutMs}ms`,
      })
    }, timeoutMs)

    proc.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    proc.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => {
      finish({ ok: false, error: err.message })
    })

    proc.on('close', (code) => {
      finish({
        ok: true,
        stdout: trimOutput(stdout),
        stderr: trimOutput(stderr),
        exitCode: code,
      })
    })
  })
}

export const formatBashToolContent = (res: {
  stdout: string
  stderr: string
  exitCode: number | null
}): string => {
  const parts: string[] = [`Exit code: ${res.exitCode ?? 'null'}`]
  if (res.stdout) parts.push(`stdout:\n${res.stdout}`)
  if (res.stderr) parts.push(`stderr:\n${res.stderr}`)
  if (!res.stdout && !res.stderr) parts.push('(no output)')
  return parts.join('\n\n')
}

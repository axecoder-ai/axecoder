import { spawn } from 'node:child_process'

const DEFAULT_TIMEOUT_MS = 120_000
const MAX_OUTPUT_CHARS = 200_000

const trimOutput = (text: string) => {
  if (text.length <= MAX_OUTPUT_CHARS) return text
  return `${text.slice(0, MAX_OUTPUT_CHARS)}\n...[output truncated]`
}

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

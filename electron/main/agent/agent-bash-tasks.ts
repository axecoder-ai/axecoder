import { spawn } from 'node:child_process'
import { getConfig } from '../config-store'
import { isDangerousGitCommand, trimBashOutput } from './agent-bash'
import { evaluateExecPolicy } from './agent-execpolicy'
import { buildShellSpawnSpec } from './agent-sandbox'

export type BackgroundShellRun = {
  id: string
  description: string
  command: string
  status: 'running' | 'completed' | 'failed'
  stdout: string
  stderr: string
  exitCode: number | null
  error?: string
  startedAt: number
}

const runs = new Map<string, BackgroundShellRun>()
let runSeq = 0

export const createShellTaskId = () => `shell-${Date.now()}-${runSeq++}`

export const getShellTask = (id: string) => runs.get(id)

export const formatShellTaskOutput = (run: BackgroundShellRun): string => {
  const lines = [
    `Task id: ${run.id}`,
    `Status: ${run.status}`,
    `Description: ${run.description}`,
    `Command: ${run.command}`,
  ]
  if (run.error) lines.push(`Error: ${run.error}`)
  lines.push(`Exit code: ${run.exitCode ?? 'null'}`)
  if (run.stdout) lines.push('', 'stdout:', run.stdout)
  if (run.stderr) lines.push('', 'stderr:', run.stderr)
  if (!run.stdout && !run.stderr && run.status === 'running') lines.push('', '(still running, no output yet)')
  return lines.join('\n')
}

/** 用户批准后异步执行 shell；立即返回 task id */
export const startBackgroundBash = async (
  projectRoot: string,
  command: string,
  opts?: { timeoutMs?: number; description?: string; sandboxEnabled?: boolean },
): Promise<{ ok: true; taskId: string } | { ok: false; error: string }> => {
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

  const sandboxOn =
    opts?.sandboxEnabled !== undefined
      ? opts.sandboxEnabled
      : (await getConfig()).agentOsSandboxEnabled !== false
  if (sandboxOn) {
    const policy = evaluateExecPolicy(cmd)
    if (policy.kind === 'deny') {
      return { ok: false, error: policy.reason }
    }
  }

  const timeoutMs = opts?.timeoutMs ?? 120_000
  const id = createShellTaskId()
  const run: BackgroundShellRun = {
    id,
    description: opts?.description?.trim() || cmd.slice(0, 80),
    command: cmd,
    status: 'running',
    stdout: '',
    stderr: '',
    exitCode: null,
    startedAt: Date.now(),
  }
  runs.set(id, run)

  const spawnSpec = buildShellSpawnSpec(projectRoot, cmd, { enabled: sandboxOn })

  const proc = spawn(spawnSpec.program, spawnSpec.args, {
    cwd: projectRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  let settled = false
  const finishRunning = () => {
    run.stdout = trimBashOutput(run.stdout)
    run.stderr = trimBashOutput(run.stderr)
  }

  const timer = setTimeout(() => {
    if (settled) return
    proc.kill('SIGTERM')
    run.status = 'failed'
    run.error = `Command timed out after ${timeoutMs}ms`
    finishRunning()
  }, timeoutMs)

  proc.stdout?.on('data', (chunk) => {
    run.stdout += chunk.toString()
  })
  proc.stderr?.on('data', (chunk) => {
    run.stderr += chunk.toString()
  })

  proc.on('error', (err) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    run.status = 'failed'
    run.error = err.message
    finishRunning()
  })

  proc.on('close', (code) => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    run.exitCode = code
    run.status = code === 0 ? 'completed' : 'failed'
    finishRunning()
  })

  return { ok: true, taskId: id }
}

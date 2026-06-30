import { spawn, type ChildProcess } from 'node:child_process'
import { getConfig } from '../config-store'
import { isDangerousGitCommand, MAX_BASH_STDIN_CHARS, trimBashOutput } from './agent-bash'
import { rejectMcpDuplicateCli } from './agent-bash-mcp-guard'
import { evaluateExecPolicy } from './agent-execpolicy'
import { buildShellSpawnSpec } from './agent-sandbox'

export type BackgroundShellRun = {
  id: string
  description: string
  command: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  stdout: string
  stderr: string
  exitCode: number | null
  error?: string
  startedAt: number
  stdinOpen: boolean
  sessionId?: string
}

const runs = new Map<string, BackgroundShellRun>()
const procById = new Map<string, ChildProcess>()
let runSeq = 0

export const createShellTaskId = () => `shell-${Date.now()}-${runSeq++}`

export const resetShellTasksForTests = () => {
  runs.clear()
  procById.clear()
  runSeq = 0
}

export const getShellTask = (id: string) => runs.get(id)

export const stopShellTask = (id: string): BackgroundShellRun | null => {
  const run = runs.get(id)
  if (!run) return null
  if (run.status !== 'running') return run
  run.status = 'stopped'
  run.error = 'Stopped by TaskStop.'
  const proc = procById.get(id)
  if (proc && !proc.killed) proc.kill('SIGTERM')
  return run
}

export const stopShellTasksForSession = (sessionId: string) => {
  const sid = sessionId.trim()
  if (!sid) return
  for (const run of runs.values()) {
    if (run.sessionId === sid && run.status === 'running') stopShellTask(run.id)
  }
}

const clampStdin = (input: string) =>
  input.length > MAX_BASH_STDIN_CHARS ? input.slice(0, MAX_BASH_STDIN_CHARS) : input

export const writeShellStdin = (
  taskId: string,
  input: string,
  opts?: { closeStdin?: boolean },
): { ok: true } | { ok: false; error: string } => {
  const run = runs.get(taskId)
  if (!run) return { ok: false, error: `Task not found: ${taskId}` }
  if (run.status !== 'running') return { ok: false, error: `Task is not running: ${taskId}` }
  if (!run.stdinOpen) return { ok: false, error: `Task stdin is closed: ${taskId}` }
  const proc = procById.get(taskId)
  if (!proc?.stdin) return { ok: false, error: 'Shell stdin not available' }

  proc.stdin.write(clampStdin(input))
  if (opts?.closeStdin) {
    proc.stdin.end()
    run.stdinOpen = false
  }
  return { ok: true }
}

export const formatShellTaskOutput = (run: BackgroundShellRun): string => {
  const lines = [
    `Task id: ${run.id}`,
    `Status: ${run.status}`,
    `Description: ${run.description}`,
    `Command: ${run.command}`,
    `Stdin open: ${run.stdinOpen}`,
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
  opts?: {
    timeoutMs?: number
    description?: string
    sandboxEnabled?: boolean
    stdin?: string
    sessionId?: string
  },
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

  const mcpDup = await rejectMcpDuplicateCli(projectRoot, cmd)
  if (mcpDup) return { ok: false, error: mcpDup }

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
  const initialStdin = opts?.stdin
  const run: BackgroundShellRun = {
    id,
    description: opts?.description?.trim() || cmd.slice(0, 80),
    command: cmd,
    status: 'running',
    stdout: '',
    stderr: '',
    exitCode: null,
    startedAt: Date.now(),
    stdinOpen: true,
    ...(opts?.sessionId?.trim() ? { sessionId: opts.sessionId.trim() } : {}),
  }
  runs.set(id, run)

  const spawnSpec = buildShellSpawnSpec(projectRoot, cmd, { enabled: sandboxOn })

  const proc = spawn(spawnSpec.program, spawnSpec.args, {
    cwd: projectRoot,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  procById.set(id, proc)

  if (initialStdin !== undefined && proc.stdin) {
    proc.stdin.write(clampStdin(initialStdin))
    proc.stdin.end()
    run.stdinOpen = false
  }

  let settled = false
  const finishRunning = () => {
    run.stdout = trimBashOutput(run.stdout)
    run.stderr = trimBashOutput(run.stderr)
    run.stdinOpen = false
    procById.delete(id)
  }

  const timer = setTimeout(() => {
    if (settled) return
    if (run.status === 'stopped') return
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
    if (run.status !== 'stopped') run.status = code === 0 ? 'completed' : 'failed'
    finishRunning()
  })

  return { ok: true, taskId: id }
}

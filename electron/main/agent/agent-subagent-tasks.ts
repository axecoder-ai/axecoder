import fs from 'node:fs/promises'
import path from 'node:path'
import { emitAgentProgress } from './agent-progress-emit'

export type BackgroundSubAgentRun = {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  report: string
  error?: string
  startedAt: number
  sessionId?: string
  agentId?: string
  outputFile?: string
}

const emitSubagentProgress = (run: BackgroundSubAgentRun) => {
  if (!run.sessionId) return
  emitAgentProgress({
    sessionId: run.sessionId,
    kind: 'subagent',
    taskId: run.id,
    status: run.status,
    description: run.description,
  })
}

const runs = new Map<string, BackgroundSubAgentRun>()
const abortByTaskId = new Map<string, AbortController>()
let runSeq = 0

export const createBackgroundRunId = () => `subtask-${Date.now()}-${runSeq++}`

export const subagentOutputPath = (projectRoot: string, taskId: string) =>
  path.join(projectRoot, '.axecoder', 'subagent-output', `${taskId}.txt`)

const writeOutputFile = async (projectRoot: string, run: BackgroundSubAgentRun) => {
  const outPath = subagentOutputPath(projectRoot, run.id)
  await fs.mkdir(path.dirname(outPath), { recursive: true })
  const body = formatTaskOutput(run)
  await fs.writeFile(outPath, body, 'utf8')
  run.outputFile = outPath
}

export const registerBackgroundAbort = (taskId: string, controller: AbortController) => {
  abortByTaskId.set(taskId, controller)
}

export const interruptBackgroundRun = (taskId: string) => {
  const ctrl = abortByTaskId.get(taskId)
  if (ctrl) ctrl.abort()
  return stopBackgroundRun(taskId)
}

export const putBackgroundRun = (run: BackgroundSubAgentRun) => {
  runs.set(run.id, run)
  emitSubagentProgress(run)
}

export const finalizeBackgroundRun = async (
  projectRoot: string,
  run: BackgroundSubAgentRun,
) => {
  putBackgroundRun(run)
  await writeOutputFile(projectRoot, run)
  abortByTaskId.delete(run.id)
}

export const listBackgroundRuns = (sessionId?: string) => {
  const all = [...runs.values()]
  if (!sessionId) return all
  return all.filter((r) => r.sessionId === sessionId)
}

export const getBackgroundRun = (id: string) => runs.get(id)

export const getBackgroundRunByAgentId = (agentId: string) => {
  for (const run of runs.values()) {
    if (run.agentId === agentId && run.status === 'running') return run
  }
  return undefined
}

export const stopBackgroundRun = (id: string) => {
  const run = runs.get(id)
  if (!run) return null
  if (run.status === 'running') {
    run.status = 'stopped'
    run.report = run.report || 'Stopped by user.'
    emitSubagentProgress(run)
    abortByTaskId.get(id)?.abort()
    abortByTaskId.delete(id)
  }
  return run
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** TaskOutput block：轮询直至非 running 或超时 */
export const waitForBackgroundRun = async (
  taskId: string,
  maxWaitMs = 30_000,
  pollMs = 400,
): Promise<BackgroundSubAgentRun | null> => {
  const deadline = Date.now() + maxWaitMs
  while (Date.now() < deadline) {
    const run = getBackgroundRun(taskId)
    if (!run) return null
    if (run.status !== 'running') return run
    await sleep(pollMs)
  }
  return getBackgroundRun(taskId) ?? null
}

export const formatTaskOutput = (run: BackgroundSubAgentRun) => {
  const lines = [
    `Task id: ${run.id}`,
    `Status: ${run.status}`,
    `Description: ${run.description}`,
  ]
  if (run.agentId) lines.push(`Agent id: ${run.agentId}`)
  if (run.outputFile) lines.push(`Output file: ${run.outputFile}`)
  if (run.error) lines.push(`Error: ${run.error}`)
  lines.push('', run.report || '(no output yet)')
  return lines.join('\n')
}

/** 单测重置 */
export const _resetBackgroundRunsForTest = () => {
  runs.clear()
  abortByTaskId.clear()
}

import { emitAgentProgress } from './agent-progress-emit'

export type BackgroundSubAgentRun = {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  report: string
  error?: string
  startedAt: number
  sessionId?: string
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
let runSeq = 0

export const createBackgroundRunId = () => `subtask-${Date.now()}-${runSeq++}`

export const putBackgroundRun = (run: BackgroundSubAgentRun) => {
  runs.set(run.id, run)
  emitSubagentProgress(run)
}

export const listBackgroundRuns = (sessionId?: string) => {
  const all = [...runs.values()]
  if (!sessionId) return all
  return all.filter((r) => r.sessionId === sessionId)
}

export const getBackgroundRun = (id: string) => runs.get(id)

export const stopBackgroundRun = (id: string) => {
  const run = runs.get(id)
  if (!run) return null
  if (run.status === 'running') {
    run.status = 'stopped'
    run.report = run.report || 'Stopped by user.'
    emitSubagentProgress(run)
  }
  return run
}

export const formatTaskOutput = (run: BackgroundSubAgentRun) => {
  const lines = [
    `Task id: ${run.id}`,
    `Status: ${run.status}`,
    `Description: ${run.description}`,
  ]
  if (run.error) lines.push(`Error: ${run.error}`)
  lines.push('', run.report || '(no output yet)')
  return lines.join('\n')
}

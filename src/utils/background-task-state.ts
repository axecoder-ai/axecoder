export type BackgroundTaskView = {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
  outputFile?: string
  error?: string
}

const TERMINAL = new Set<BackgroundTaskView['status']>(['completed', 'failed', 'stopped'])

export const isTerminalBackgroundStatus = (status: BackgroundTaskView['status']) =>
  TERMINAL.has(status)

export const hasRunningBackgroundTasks = (tasks: BackgroundTaskView[]) =>
  tasks.some((t) => t.status === 'running')

export const mergeSubagentProgress = (
  tasks: BackgroundTaskView[],
  payload: {
    taskId: string
    description: string
    status: BackgroundTaskView['status']
  },
): BackgroundTaskView[] => {
  const idx = tasks.findIndex((t) => t.id === payload.taskId)
  if (idx < 0) {
    return [
      ...tasks,
      {
        id: payload.taskId,
        description: payload.description,
        status: payload.status,
      },
    ]
  }
  const cur = tasks[idx]!
  if (isTerminalBackgroundStatus(cur.status) && payload.status === 'running') {
    return tasks
  }
  const next = [...tasks]
  next[idx] = {
    ...cur,
    description: payload.description || cur.description,
    status: payload.status,
  }
  return next
}

export const mergeBackgroundTaskSnapshots = (
  current: BackgroundTaskView[],
  snapshots: BackgroundTaskView[],
): BackgroundTaskView[] => {
  let next = [...current]
  for (const snap of snapshots) {
    const idx = next.findIndex((t) => t.id === snap.id)
    if (idx < 0) {
      next.push(snap)
      continue
    }
    const cur = next[idx]!
    if (isTerminalBackgroundStatus(cur.status) && snap.status === 'running') continue
    next[idx] = { ...cur, ...snap }
  }
  return next
}

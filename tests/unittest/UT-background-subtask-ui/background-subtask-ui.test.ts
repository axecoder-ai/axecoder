import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  _resetBackgroundRunsForTest,
  formatTaskOutput,
  parseTaskOutputFile,
  putBackgroundRun,
  resolveBackgroundTasks,
  subagentOutputPath,
} from '../../../electron/main/agent/agent-subagent-tasks'
import {
  hasRunningBackgroundTasks,
  mergeBackgroundTaskSnapshots,
  mergeSubagentProgress,
} from '../../../src/utils/background-task-state'

describe('background-subtask-ui', () => {
  afterEach(() => {
    _resetBackgroundRunsForTest()
  })

  it('parseTaskOutputFile 解析终态字段', () => {
    const body = [
      'Task id: subtask-1',
      'Status: completed',
      'Description: translate files',
      'Agent id: agent-abc',
      'Output file: /tmp/out.txt',
      '',
      'done',
    ].join('\n')
    const parsed = parseTaskOutputFile(body)
    expect(parsed?.status).toBe('completed')
    expect(parsed?.description).toBe('translate files')
    expect(parsed?.outputFile).toBe('/tmp/out.txt')
  })

  it('resolveBackgroundTasks 优先内存 Map', async () => {
    const root = process.cwd()
    putBackgroundRun({
      id: 'subtask-mem',
      description: 'from map',
      status: 'running',
      report: '',
      startedAt: Date.now(),
    })
    const tasks = await resolveBackgroundTasks(root, ['subtask-mem'])
    expect(tasks).toHaveLength(1)
    expect(tasks[0]?.status).toBe('running')
    expect(tasks[0]?.description).toBe('from map')
  })

  it('resolveBackgroundTasks Map 未命中时读 output 文件', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-bg-'))
    const taskId = 'subtask-disk'
    const run = {
      id: taskId,
      description: 'disk task',
      status: 'completed' as const,
      report: 'all good',
      startedAt: Date.now(),
    }
    const outPath = subagentOutputPath(root, taskId)
    await fs.mkdir(path.dirname(outPath), { recursive: true })
    await fs.writeFile(outPath, formatTaskOutput(run), 'utf8')
    const tasks = await resolveBackgroundTasks(root, [taskId])
    expect(tasks[0]?.status).toBe('completed')
    expect(tasks[0]?.description).toBe('disk task')
    expect(tasks[0]?.outputFile).toContain(taskId)
  })

  it('mergeSubagentProgress 按 taskId 更新', () => {
    const next = mergeSubagentProgress(
      [{ id: 'a', description: 'old', status: 'running' }],
      { taskId: 'a', description: 'new', status: 'completed' },
    )
    expect(next[0]?.status).toBe('completed')
    expect(next[0]?.description).toBe('new')
  })

  it('mergeBackgroundTaskSnapshots 终态不被 running 覆盖', () => {
    const next = mergeBackgroundTaskSnapshots(
      [{ id: 'x', description: 'done', status: 'completed' }],
      [{ id: 'x', description: 'stale', status: 'running' }],
    )
    expect(next[0]?.status).toBe('completed')
  })

  it('hasRunningBackgroundTasks 检测 running', () => {
    expect(hasRunningBackgroundTasks([{ id: '1', description: '', status: 'completed' }])).toBe(
      false,
    )
    expect(hasRunningBackgroundTasks([{ id: '1', description: '', status: 'running' }])).toBe(true)
  })
})

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  getShellTask,
  resetShellTasksForTests,
  startBackgroundBash,
  stopShellTask,
} from '../../../electron/main/agent/agent-bash-tasks'
import { executeExtendedAgentTool } from '../../../electron/main/agent/agent-ext-executor'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('stopShellTask', () => {
  let tmpDir = ''

  afterEach(async () => {
    resetShellTasksForTests()
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
      tmpDir = ''
    }
  })

  it('终止 running 的后台 sleep', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-cancel-shell-'))
    const sleepCmd =
      process.platform === 'win32' ? 'powershell -Command Start-Sleep -Seconds 60' : 'sleep 60'
    const started = await startBackgroundBash(tmpDir, sleepCmd, { description: 'long sleep' })
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const run = getShellTask(started.taskId)
    expect(run?.status).toBe('running')

    const stopped = stopShellTask(started.taskId)
    expect(stopped?.status).toBe('stopped')
    expect(stopped?.error).toMatch(/Stopped/i)

    for (let i = 0; i < 20; i++) {
      await wait(50)
      const after = getShellTask(started.taskId)
      if (after?.status === 'stopped') break
    }
    expect(getShellTask(started.taskId)?.status).toBe('stopped')
  })

  it('已完成任务再次 stop 仍返回 run（幂等）', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-cancel-shell-'))
    const cmd = process.platform === 'win32' ? 'echo done' : 'echo done'
    const started = await startBackgroundBash(tmpDir, cmd)
    expect(started.ok).toBe(true)
    if (!started.ok) return

    for (let i = 0; i < 50; i++) {
      const run = getShellTask(started.taskId)
      if (run?.status === 'completed') break
      await wait(50)
    }
    expect(getShellTask(started.taskId)?.status).toBe('completed')

    const again = stopShellTask(started.taskId)
    expect(again?.status).toBe('completed')
  })

  it('TaskStop 工具可停止 shell task_id', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-cancel-shell-'))
    const sleepCmd =
      process.platform === 'win32' ? 'powershell -Command Start-Sleep -Seconds 60' : 'sleep 60'
    const started = await startBackgroundBash(tmpDir, sleepCmd, { sessionId: 'sess-1' })
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const ctx = { projectRoot: tmpDir, readCache: new Set<string>(), sessionId: 'sess-1' }
    const res = await executeExtendedAgentTool(ctx, {
      id: 'tc-stop',
      name: 'TaskStop',
      arguments: { task_id: started.taskId },
    })
    expect(res.log.ok).toBe(true)
    expect(res.content).toMatch(/Stopped shell task/)
    expect(getShellTask(started.taskId)?.status).toBe('stopped')
  })
})

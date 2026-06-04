import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { buildCoreAgentTools } from '../../../electron/main/agent/agent-tool-prompts'
import {
  formatBackgroundBashStarted,
  parseBashTimeoutMs,
  runAgentBash,
} from '../../../electron/main/agent/agent-bash'
import {
  formatShellTaskOutput,
  getShellTask,
  startBackgroundBash,
} from '../../../electron/main/agent/agent-bash-tasks'
import { executeAgentTool } from '../../../electron/main/agent/tool-executor'

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('Bash CC schema parity', () => {
  it('Bash 工具注册 timeout / description / run_in_background', () => {
    const bash = buildCoreAgentTools().find((t) => t.name === 'Bash')
    expect(bash).toBeDefined()
    const props = bash!.parameters.properties as Record<string, unknown>
    expect(props).toHaveProperty('timeout')
    expect(props).toHaveProperty('description')
    expect(props).toHaveProperty('run_in_background')
  })
})

describe('parseBashTimeoutMs', () => {
  it('读取 timeout 并封顶 600000', () => {
    expect(parseBashTimeoutMs({ timeout: 900_000 })).toBe(600_000)
    expect(parseBashTimeoutMs({ timeout_ms: 30_000 })).toBe(30_000)
  })

  it('无效值返回 undefined', () => {
    expect(parseBashTimeoutMs({})).toBeUndefined()
    expect(parseBashTimeoutMs({ timeout: 0 })).toBeUndefined()
  })
})

describe('background bash tasks', () => {
  let tmpDir = ''

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
      tmpDir = ''
    }
  })

  it('startBackgroundBash 完成 echo 且 TaskOutput 可读', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-bash-bg-'))
    const isWin = process.platform === 'win32'
    const cmd = isWin ? 'echo bg-parity' : 'echo bg-parity'
    const started = startBackgroundBash(tmpDir, cmd, { description: 'test echo' })
    expect(started.ok).toBe(true)
    if (!started.ok) return

    let run = getShellTask(started.taskId)
    for (let i = 0; i < 50 && run?.status === 'running'; i++) {
      await wait(50)
      run = getShellTask(started.taskId)
    }
    expect(run?.status).toBe('completed')
    expect(run?.stdout).toMatch(/bg-parity/)
    const text = formatShellTaskOutput(run!)
    expect(text).toMatch(/Task id:/)
    expect(text).toMatch(/bg-parity/)
  })

  it('formatBackgroundBashStarted 含 task id', () => {
    const text = formatBackgroundBashStarted('shell-1', 'npm test')
    expect(text).toMatch(/shell-1/)
    expect(text).toMatch(/TaskOutput/)
    expect(text).toMatch(/npm test/)
  })
})

describe('executeAgentTool Bash run_in_background', () => {
  it('bash_pending 携带 runInBackground', async () => {
    const ctx = { projectRoot: os.tmpdir(), readCache: new Set<string>() }
    const run = await executeAgentTool(ctx, {
      id: 'tc-bg',
      name: 'Bash',
      arguments: {
        command: 'echo x',
        run_in_background: true,
        description: 'echo test',
        timeout: 60_000,
      },
    })
    expect(run.kind).toBe('bash_pending')
    if (run.kind === 'bash_pending') {
      expect(run.pendingBash.runInBackground).toBe(true)
      expect(run.pendingBash.description).toBe('echo test')
      expect(run.pendingBash.timeoutMs).toBe(60_000)
    }
  })
})

describe('runAgentBash foreground unchanged', () => {
  let tmpDir = ''

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
      tmpDir = ''
    }
  })

  it('前台 echo 仍可用', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-bash-fg-'))
    const res = await runAgentBash(tmpDir, process.platform === 'win32' ? 'echo fg' : 'echo fg')
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.stdout).toMatch(/fg/)
  })
})

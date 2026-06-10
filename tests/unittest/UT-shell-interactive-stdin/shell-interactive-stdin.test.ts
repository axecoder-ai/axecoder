import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getAppPath: () => process.cwd() },
}))

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(async () => ({
    agentOsSandboxEnabled: false,
  })),
}))

const mockSpawn = vi.fn()
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}))

vi.mock('../../../electron/main/agent/agent-sandbox', () => ({
  buildShellSpawnSpec: (_root: string, cmd: string) => ({
    program: process.platform === 'win32' ? 'cmd.exe' : 'sh',
    args: process.platform === 'win32' ? ['/c', cmd] : ['-lc', cmd],
  }),
}))

import { buildCoreAgentTools } from '../../../electron/main/agent/agent-tool-prompts'
import { buildExtendedAgentTools } from '../../../electron/main/agent/agent-tool-prompts-ext'
import { runAgentBash } from '../../../electron/main/agent/agent-bash'
import {
  resetShellTasksForTests,
  startBackgroundBash,
  writeShellStdin,
} from '../../../electron/main/agent/agent-bash-tasks'
import { executeExtendedAgentTool } from '../../../electron/main/agent/agent-ext-executor'

const makeProc = () => {
  const stdout = new EventEmitter()
  const stderr = new EventEmitter()
  const stdin = { write: vi.fn(), end: vi.fn() }
  const proc = Object.assign(new EventEmitter(), {
    stdout,
    stderr,
    stdin,
    kill: vi.fn(),
  })
  return proc
}

describe('shell stdin tool registry', () => {
  it('Bash 工具注册 stdin 参数', () => {
    const bash = buildCoreAgentTools().find((t) => t.name === 'Bash')
    const props = bash!.parameters.properties as Record<string, unknown>
    expect(props).toHaveProperty('stdin')
  })

  it('扩展工具含 ShellStdin', () => {
    const names = buildExtendedAgentTools().map((t) => t.name)
    expect(names).toContain('ShellStdin')
  })
})

describe('writeShellStdin', () => {
  beforeEach(() => {
    resetShellTasksForTests()
    mockSpawn.mockReset()
  })

  afterEach(() => {
    resetShellTasksForTests()
  })

  it('任务不存在时返回错误', async () => {
    const res = writeShellStdin('missing', 'hi')
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toMatch(/not found/)
  })

  it('向运行中任务写入 stdin', async () => {
    const proc = makeProc()
    mockSpawn.mockReturnValue(proc)
    const started = await startBackgroundBash('/tmp', 'node -e "process.stdin.on(\'data\',()=>{})"')
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const res = writeShellStdin(started.taskId, 'hello\n')
    expect(res.ok).toBe(true)
    expect(proc.stdin.write).toHaveBeenCalledWith('hello\n')
    expect(proc.stdin.end).not.toHaveBeenCalled()
  })

  it('close_stdin 时 end stdin', async () => {
    const proc = makeProc()
    mockSpawn.mockReturnValue(proc)
    const started = await startBackgroundBash('/tmp', 'sleep 60')
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const res = writeShellStdin(started.taskId, 'y\n', { closeStdin: true })
    expect(res.ok).toBe(true)
    expect(proc.stdin.end).toHaveBeenCalled()
  })

  it('已结束任务不可写 stdin', async () => {
    const proc = makeProc()
    mockSpawn.mockReturnValue(proc)
    const started = await startBackgroundBash('/tmp', 'echo done')
    expect(started.ok).toBe(true)
    if (!started.ok) return
    proc.emit('close', 0)

    const res = writeShellStdin(started.taskId, 'late')
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toMatch(/not running/)
  })
})

describe('startBackgroundBash initial stdin', () => {
  beforeEach(() => {
    resetShellTasksForTests()
    mockSpawn.mockReset()
  })

  afterEach(() => {
    resetShellTasksForTests()
  })

  it('启动时注入 stdin 并关闭', async () => {
    const proc = makeProc()
    mockSpawn.mockReturnValue(proc)
    const started = await startBackgroundBash('/tmp', 'cat', { stdin: 'piped\n' })
    expect(started.ok).toBe(true)
    expect(proc.stdin.write).toHaveBeenCalledWith('piped\n')
    expect(proc.stdin.end).toHaveBeenCalled()
  })
})

describe('runAgentBash stdin', () => {
  beforeEach(() => {
    mockSpawn.mockReset()
  })

  it('前台 Bash 写入 stdin 后 end', async () => {
    const proc = makeProc()
    mockSpawn.mockReturnValue(proc)
    const p = runAgentBash('/tmp', 'cat', 5000, undefined, 'one-shot\n')
    await new Promise((r) => setTimeout(r, 5))
    proc.emit('close', 0)
    const res = await p
    expect(res.ok).toBe(true)
    expect(proc.stdin.write).toHaveBeenCalledWith('one-shot\n')
    expect(proc.stdin.end).toHaveBeenCalled()
  })
})

describe('executor ShellStdin', () => {
  beforeEach(() => {
    resetShellTasksForTests()
    mockSpawn.mockReset()
  })

  afterEach(() => {
    resetShellTasksForTests()
  })

  it('ShellStdin 通过 ext executor 写入', async () => {
    const proc = makeProc()
    mockSpawn.mockReturnValue(proc)
    const started = await startBackgroundBash('/tmp', 'sleep 30')
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const run = await executeExtendedAgentTool(
      { projectRoot: '/tmp', readCache: new Set() },
      { id: 'tc-stdin', name: 'ShellStdin', arguments: { task_id: started.taskId, input: 'ok\n' } },
    )
    expect(run.content).toMatch(/Wrote/)
    expect(proc.stdin.write).toHaveBeenCalledWith('ok\n')
  })
})

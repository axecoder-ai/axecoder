import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { AGENT_TOOLS } from '../../../electron/main/agent/agent-tool-defs'
import { formatBashToolContent, runAgentBash } from '../../../electron/main/agent/agent-bash'
import { executeAgentTool } from '../../../electron/main/agent/tool-executor'

describe('Agent Bash tool', () => {
  it('已注册 Bash', () => {
    expect(AGENT_TOOLS.map((t) => t.name)).toContain('Bash')
  })
})

describe('runAgentBash', () => {
  let tmpDir = ''

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
      tmpDir = ''
    }
  })

  it('在项目目录执行 echo', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-bash-'))
    const isWin = process.platform === 'win32'
    const res = await runAgentBash(tmpDir, isWin ? 'echo hello' : 'echo hello')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.exitCode).toBe(0)
    expect(res.stdout).toMatch(/hello/)
    expect(formatBashToolContent(res)).toMatch(/Exit code: 0/)
  })

  it('空命令返回错误', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-bash-'))
    const res = await runAgentBash(tmpDir, '   ')
    expect(res.ok).toBe(false)
  })
})

describe('executeAgentTool Bash', () => {
  it('返回 bash_pending 而非立即执行', async () => {
    const ctx = { projectRoot: os.tmpdir(), readCache: new Set<string>() }
    const run = await executeAgentTool(ctx, {
      id: 'tc1',
      name: 'Bash',
      arguments: { command: 'echo pending-test' },
    })
    expect(run.kind).toBe('bash_pending')
    if (run.kind === 'bash_pending') {
      expect(run.pendingBash.command).toBe('echo pending-test')
    }
  })
})

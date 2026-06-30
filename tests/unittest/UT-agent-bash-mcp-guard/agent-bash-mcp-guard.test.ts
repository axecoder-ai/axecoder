import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  isMongoCliCommand,
  isMysqlCliCommand,
  rejectMcpDuplicateCli,
} from '../../../electron/main/agent/agent-bash-mcp-guard'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-bash-mcp-guard-'))
  setAxecoderDirForTests(tmpDir)
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('agent-bash-mcp-guard', () => {
  it('识别 mongosh / mongo / which mongosh 命令', () => {
    expect(isMongoCliCommand('which mongosh 2>/dev/null || echo not found')).toBe(true)
    expect(isMongoCliCommand('mongosh "mongodb://localhost"')).toBe(true)
    expect(isMongoCliCommand('brew install mongosh')).toBe(true)
    expect(isMongoCliCommand('git status')).toBe(false)
  })

  it('识别 mysql CLI 命令', () => {
    expect(isMysqlCliCommand('which mysql 2>/dev/null')).toBe(true)
    expect(isMysqlCliCommand('mysql -h127.0.0.1 -uroot -p')).toBe(true)
    expect(isMysqlCliCommand('brew install mysql')).toBe(true)
    expect(isMysqlCliCommand('git status')).toBe(false)
  })

  it('有 mysql MCP 时拒绝 mysql CLI', async () => {
    const projectDir = path.join(tmpDir, 'proj-mysql')
    await fs.mkdir(projectDir, { recursive: true })
    const msg = await rejectMcpDuplicateCli(projectDir, 'which mysql 2>/dev/null')
    expect(msg).toMatch(/CallMcpTool/)
    expect(msg).toMatch(/mysql/)
  })

  it('有 mongodb MCP 时拒绝 mongosh', async () => {
    const projectDir = path.join(tmpDir, 'proj')
    await fs.mkdir(projectDir, { recursive: true })
    const msg = await rejectMcpDuplicateCli(
      projectDir,
      'which mongosh 2>/dev/null || which mongo 2>/dev/null',
    )
    expect(msg).toMatch(/CallMcpTool/)
    expect(msg).toMatch(/mongodb/)
  })

  it('无 projectRoot 时不注入 mongodb 时不拦截', async () => {
    const msg = await rejectMcpDuplicateCli(tmpDir, 'echo ok')
    expect(msg).toBeNull()
  })
})

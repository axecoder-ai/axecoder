import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  discoverCustomCommands,
  findCustomCommandByName,
} from '../../../electron/main/agent/agent-custom-commands'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'

describe('agent-custom-commands', () => {
  let tmpHome = ''
  let projectRoot = ''

  beforeEach(async () => {
    tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-cmd-'))
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-proj-'))
    setAxecoderDirForTests(tmpHome)
    const cmdDir = path.join(tmpHome, 'commands')
    await fs.mkdir(cmdDir, { recursive: true })
    await fs.writeFile(
      path.join(cmdDir, 'create-proposals.md'),
      '# 确认方案\n\n正文指令',
      'utf-8',
    )
  })

  afterEach(() => {
    setAxecoderDirForTests(null)
  })

  it('发现 ~/.axecoder/commands 下的 md 命令', async () => {
    const list = await discoverCustomCommands(projectRoot)
    expect(list.map((c) => c.name)).toContain('create-proposals')
  })

  it('项目命令覆盖同名用户命令', async () => {
    const projCmd = path.join(projectRoot, '.axecoder', 'commands')
    await fs.mkdir(projCmd, { recursive: true })
    await fs.writeFile(path.join(projCmd, 'create-proposals.md'), '# 项目版', 'utf-8')
    const found = await findCustomCommandByName(projectRoot, 'create-proposals')
    expect(found?.source).toBe('project')
    const content = await fs.readFile(found!.path, 'utf-8')
    expect(content).toContain('项目版')
  })
})

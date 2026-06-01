import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { getConfig, setConfig } from '../../../electron/main/config-store'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-config-'))
  setAxecoderDirForTests(tmpDir)
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('config-store', () => {
  it('默认配置', async () => {
    const c = await getConfig()
    expect(c.autoSave).toBe(true)
    expect(c.fontSize).toBe(14)
    expect(c.agentAutoApplyWrites).toBe(false)
    expect(c.agentOutputStyle).toBe('default')
  })

  it('可更新 agentOutputStyle', async () => {
    const c = await setConfig({ agentOutputStyle: 'Learning' })
    expect(c.agentOutputStyle).toBe('Learning')
  })

  it('部分更新', async () => {
    const c = await setConfig({ fontSize: 16 })
    expect(c.fontSize).toBe(16)
    expect(c.autoSave).toBe(true)
  })
})

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { getConfig, setConfig } from '../../../electron/main/config-store'
import { setWritcraftDirForTests } from '../../../electron/main/writcraft-dir'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-config-'))
  setWritcraftDirForTests(tmpDir)
})

afterEach(async () => {
  setWritcraftDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('config-store', () => {
  it('默认配置', async () => {
    const c = await getConfig()
    expect(c.autoSave).toBe(true)
    expect(c.fontSize).toBe(14)
  })

  it('部分更新', async () => {
    const c = await setConfig({ fontSize: 16 })
    expect(c.fontSize).toBe(16)
    expect(c.autoSave).toBe(true)
  })
})

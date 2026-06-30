import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  readMcpPluginsFile,
  setPluginEnabled,
  isPluginEnabled,
  CONTEXT7_PLUGIN_ID,
} from '../../../electron/main/mcp-plugins-store'
import { MONGODB_PLUGIN_ID, MYSQL_PLUGIN_ID, MONGODB_SECRET_KEY, MYSQL_SECRET_KEY } from '../../../electron/main/mcp-plugins-registry'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-mcp-plugins-'))
  setAxecoderDirForTests(tmpDir)
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('mcp-plugins-store', () => {
  it('默认 context7 为 disabled，mongodb/mysql 在 defaultFile 中为 disabled', async () => {
    const file = await readMcpPluginsFile()
    expect(file.schemaVersion).toBe(1)
    expect(file.plugins[CONTEXT7_PLUGIN_ID]?.enabled).toBe(false)
    expect(file.plugins.mongodb?.enabled).toBe(false)
    expect(file.plugins.mysql?.enabled).toBe(false)
  })

  it('setPluginEnabled 持久化', async () => {
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, true)
    expect(await isPluginEnabled(CONTEXT7_PLUGIN_ID)).toBe(true)
    const raw = await fs.readFile(path.join(tmpDir, 'mcp-plugins.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { plugins: Record<string, { enabled: boolean }> }
    expect(parsed.plugins[CONTEXT7_PLUGIN_ID].enabled).toBe(true)
  })

  it('MongoDB / MySQL 按项目默认 enabled（无显式配置时）', async () => {
    const projectDir = path.join(tmpDir, 'proj')
    await fs.mkdir(projectDir, { recursive: true })
    expect(await isPluginEnabled(MONGODB_PLUGIN_ID, projectDir)).toBe(true)
    expect(await isPluginEnabled(MYSQL_PLUGIN_ID, projectDir)).toBe(true)
    expect(await isPluginEnabled(MONGODB_PLUGIN_ID)).toBe(false)
  })

  it('MongoDB setPluginEnabled 按项目持久化', async () => {
    const projectDir = path.join(tmpDir, 'proj')
    await fs.mkdir(projectDir, { recursive: true })
    await setPluginEnabled(MONGODB_PLUGIN_ID, true, projectDir)
    expect(await isPluginEnabled(MONGODB_PLUGIN_ID, projectDir)).toBe(true)
    expect(await isPluginEnabled(MONGODB_PLUGIN_ID)).toBe(false)
    const raw = await fs.readFile(path.join(projectDir, '.axecoder', 'mcp-plugins.json'), 'utf-8')
    const parsed = JSON.parse(raw) as { plugins: Record<string, { enabled: boolean }> }
    expect(parsed.plugins[MONGODB_PLUGIN_ID].enabled).toBe(true)
  })

  it('toggle 关闭后 enabled 为 false', async () => {
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, true)
    await setPluginEnabled(CONTEXT7_PLUGIN_ID, false)
    expect(await isPluginEnabled(CONTEXT7_PLUGIN_ID)).toBe(false)
  })

  it('未知插件 id 抛出错误', async () => {
    await expect(setPluginEnabled('unknown-plugin', true)).rejects.toThrow()
  })
})

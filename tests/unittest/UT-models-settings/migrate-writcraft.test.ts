import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { runMigrate } from '../../../electron/main/migrate-writcraft'
import { setWritcraftDirForTests, getWritcraftDir } from '../../../electron/main/writcraft-dir'
import { listModels } from '../../../electron/main/models-store'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-migrate-'))
  setWritcraftDirForTests(tmpDir)
})

afterEach(async () => {
  setWritcraftDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('migrate-writcraft', () => {
  it('从 legacy 字段迁移一条 openai 模型', async () => {
    await runMigrate({
      legacyAi: {
        aiEndpoint: 'https://api.deepseek.com',
        aiModel: 'deepseek-chat',
        aiApiKey: 'sk-legacy',
      },
      legacyConfig: { autoSave: true, autoSaveDelay: 500, fontSize: 15 },
    })
    const models = await listModels()
    expect(models.models).toHaveLength(1)
    expect(models.models[0].provider).toBe('openai')
    expect(models.models[0].modelId).toBe('deepseek-chat')
    const secretsRaw = await fs.readFile(path.join(getWritcraftDir(), 'secrets.json'), 'utf-8')
    expect(JSON.parse(secretsRaw)).toHaveProperty(models.models[0].id, 'sk-legacy')
  })

  it('已有 models.json 时不重复迁移', async () => {
    const dir = getWritcraftDir()
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(
      path.join(dir, 'models.json'),
      JSON.stringify({ schemaVersion: 1, activeModelId: 'x', models: [] }),
      'utf-8',
    )
    await runMigrate({
      legacyAi: {
        aiEndpoint: 'https://api.example.com',
        aiModel: 'm',
        aiApiKey: 'k',
      },
    })
    const models = await listModels()
    expect(models.models).toHaveLength(0)
    expect(models.activeModelId).toBe('x')
  })
})

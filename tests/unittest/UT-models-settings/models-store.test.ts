import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  listModels,
  saveModel,
  deleteModel,
  toggleModel,
  setActiveModel,
  getModelById,
} from '../../../electron/main/models-store'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import { writeSecrets } from '../../../electron/main/secrets-store'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-models-'))
  setAxecoderDirForTests(tmpDir)
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('models-store', () => {
  it('空列表时 activeModelId 为空', async () => {
    const data = await listModels()
    expect(data.models).toEqual([])
    expect(data.activeModelId).toBe('')
  })

  it('保存模型并写入 secrets', async () => {
    const saved = await saveModel({
      id: 'm1',
      name: 'DeepSeek',
      provider: 'openai',
      modelId: 'deepseek-chat',
      baseUrl: 'https://api.deepseek.com',
      enabled: true,
      apiKey: 'sk-test',
    })
    expect(saved.models).toHaveLength(1)
    expect(saved.activeModelId).toBe('m1')
    const m = await getModelById('m1')
    expect(m?.name).toBe('DeepSeek')
  })

  it('toggle 禁用模型', async () => {
    await saveModel({
      id: 'm1',
      name: 'A',
      provider: 'openai',
      modelId: 'a',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
    })
    const toggled = await toggleModel('m1', false)
    expect(toggled.models[0].enabled).toBe(false)
  })

  it('delete 移除模型与 active', async () => {
    await saveModel({
      id: 'm1',
      name: 'A',
      provider: 'ollama',
      modelId: 'llama',
      baseUrl: 'http://127.0.0.1:11434',
      enabled: true,
    })
    await writeSecrets({ m1: 'key' })
    const after = await deleteModel('m1')
    expect(after.models).toHaveLength(0)
    expect(after.activeModelId).toBe('')
  })

  it('setActiveModel 切换当前模型', async () => {
    await saveModel({
      id: 'm1',
      name: 'A',
      provider: 'openai',
      modelId: 'a',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
    })
    await saveModel({
      id: 'm2',
      name: 'B',
      provider: 'openai',
      modelId: 'b',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
    })
    const data = await setActiveModel('m2')
    expect(data.activeModelId).toBe('m2')
  })
})

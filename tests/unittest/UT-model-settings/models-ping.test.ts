import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import { saveModel } from '../../../electron/main/models-store'
import { pingModel } from '../../../electron/main/models-ping'

vi.mock('../../../electron/main/ai/chat-with-provider', () => ({
  chatWithProvider: vi.fn(),
}))

import { chatWithProvider } from '../../../electron/main/ai/chat-with-provider'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-ping-'))
  setAxecoderDirForTests(tmpDir)
  vi.mocked(chatWithProvider).mockReset()
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('models-ping', () => {
  it('模型不存在时返回错误', async () => {
    const res = await pingModel('missing')
    expect(res).toEqual({ ok: false, error: '模型不存在' })
  })

  it('禁用模型时返回错误', async () => {
    await saveModel({
      id: 'm1',
      name: 'A',
      provider: 'openai',
      modelId: 'gpt',
      baseUrl: 'https://api.openai.com/v1',
      enabled: false,
    })
    const res = await pingModel('m1')
    expect(res).toEqual({ ok: false, error: '请先启用该模型' })
  })

  it('Provider 成功时返回预览', async () => {
    await saveModel({
      id: 'm1',
      name: 'A',
      provider: 'openai',
      modelId: 'gpt',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
      apiKey: 'sk-x',
    })
    vi.mocked(chatWithProvider).mockResolvedValue({
      ok: true,
      text: 'hello world',
      content: 'hello world',
    })
    const res = await pingModel('m1')
    expect(res).toEqual({ ok: true, preview: 'hello world' })
    expect(chatWithProvider).toHaveBeenCalled()
  })

  it('Provider 失败时透传错误', async () => {
    await saveModel({
      id: 'm1',
      name: 'A',
      provider: 'openai',
      modelId: 'gpt',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
    })
    vi.mocked(chatWithProvider).mockResolvedValue({ ok: false, error: '401 Unauthorized' })
    const res = await pingModel('m1')
    expect(res).toEqual({ ok: false, error: '401 Unauthorized' })
  })
})

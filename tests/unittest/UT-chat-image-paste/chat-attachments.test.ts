import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  saveChatPastedImage,
  resolveChatImageRefs,
} from '../../../electron/main/chat-attachments'

describe('chat-attachments', () => {
  let tmpHome: string

  beforeEach(async () => {
    tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-chat-img-'))
    setAxecoderDirForTests(tmpHome)
  })

  afterEach(async () => {
    setAxecoderDirForTests(null)
    await fs.rm(tmpHome, { recursive: true, force: true })
  })

  it('保存并解析图片引用', async () => {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    const ref = await saveChatPastedImage('sess-1', png.toString('base64'), 'image/png')
    const images = await resolveChatImageRefs([ref])
    expect(images).toHaveLength(1)
    expect(images[0].mimeType).toBe('image/png')
    expect(images[0].data.length).toBeGreaterThan(10)
  })
})

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  composeMemoryPrompt,
  forgetMemory,
  loadMemoryIndex,
  saveMemory,
} from '../../../electron/main/agent/agent-memory'

describe('agent-memory', () => {
  it('remember 写入索引并在 prompt 中出现', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-mem-'))
    await fs.writeFile(
      path.join(tmp, 'AGENTS.md'),
      '# Guidelines\nPrefer minimal diffs.',
      'utf-8',
    )
    const saved = await saveMemory(tmp, {
      name: 'prefers-tabs',
      description: 'User prefers tabs',
      type: 'user',
      body: 'Always use tabs for indentation.',
    })
    expect(saved.ok).toBe(true)
    const index = await loadMemoryIndex(tmp)
    expect(index).toContain('prefers-tabs')
    const prompt = await composeMemoryPrompt(tmp)
    expect(prompt).toContain('AGENTS.md')
    expect(prompt).toContain('prefers-tabs')
    if (saved.ok) {
      const forgot = await forgetMemory(tmp, saved.name)
      expect(forgot.ok).toBe(true)
    }
  })
})

import { describe, expect, it, vi } from 'vitest'
import type { SlashContext } from '../../../src/slash-commands/types'
import { runSlashCommand } from '../../../src/slash-commands/run'

function makeCtx(overrides: Partial<SlashContext> = {}): SlashContext {
  return {
    projectRoot: '/proj',
    getSession: () => null,
    setSession: () => {},
    persist: vi.fn(async () => {}),
    newChat: vi.fn(async () => {}),
    getModelsFile: () => ({ schemaVersion: 1, activeModelId: '', models: [] }),
    setModelsFile: () => {},
    setActiveModel: vi.fn(async () => ({ ok: false })),
    openModelsSettings: vi.fn(),
    ...overrides,
  }
}

describe('runSlashCommand', () => {
  it('非斜杠输入返回 null', async () => {
    expect(await runSlashCommand('hello', makeCtx())).toBeNull()
  })

  it('未知斜杠命令提示 help', async () => {
    const res = await runSlashCommand('/foo', makeCtx())
    expect(res?.ok).toBe(false)
    if (res && !res.ok) expect(res.message).toContain('/help')
  })

  it('/help 列出命令', async () => {
    const res = await runSlashCommand('/help', makeCtx())
    expect(res?.ok).toBe(true)
    if (res?.ok) expect(res.message).toContain('/clear')
  })
})

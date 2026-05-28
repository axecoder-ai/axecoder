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
    initBackground: vi.fn(async () => ({
      ok: true,
      manifestPath: '/proj/.writcraft/background.json',
      counts: { params: 1, tender: 0, negotiation: 0, background: 0 },
    })),
    ...overrides,
  }
}

describe('runSlashCommand', () => {
  it('非斜杠输入返回 null', async () => {
    expect(await runSlashCommand('hello', makeCtx())).toBeNull()
  })

  it('未知斜杠命令提示暂无', async () => {
    const res = await runSlashCommand('/foo', makeCtx())
    expect(res?.ok).toBe(false)
    if (res && !res.ok) expect(res.message).toContain('暂无')
  })

  it('/init 成功时返回摘要', async () => {
    const initBackground = vi.fn(async () => ({
      ok: true as const,
      manifestPath: '/proj/.writcraft/background.json',
      summaryPath: '.writcraft/参数汇总.md',
      parameters: [
        { id: '1', label: '参数1', title: '标题一', status: 'responded' as const },
        { id: '2', label: '参数2', title: '标题二', status: 'pending' as const },
      ],
      counts: { parameters: 2, responded: 1, pending: 1, tender: 1, negotiation: 0, background: 3 },
    }))
    const res = await runSlashCommand(
      '/init',
      makeCtx({
        initBackground,
        getModelsFile: () => ({
          schemaVersion: 1,
          activeModelId: 'm1',
          models: [
            {
              id: 'm1',
              name: 'Test',
              provider: 'openai',
              modelId: 'gpt',
              baseUrl: 'https://api.example.com',
              enabled: true,
            },
          ],
        }),
      }),
    )
    expect(initBackground).toHaveBeenCalledWith('m1')
    expect(res?.ok).toBe(true)
    if (res && res.ok) {
      expect(res.message).toContain('背景资料初始化完成')
      expect(res.message).toContain('参数汇总')
      expect(res.message).toContain('参数1 标题一（技术，已响应）')
      expect(res.message).toContain('参数2 标题二（技术，未响应）')
    }
  })

  it('/init 无项目时失败', async () => {
    const res = await runSlashCommand('/init', makeCtx({ projectRoot: '' }))
    expect(res?.ok).toBe(false)
    if (res && !res.ok) expect(res.message).toContain('打开项目')
  })

  it('/init 无模型时失败', async () => {
    const res = await runSlashCommand('/init', makeCtx())
    expect(res?.ok).toBe(false)
    if (res && !res.ok) expect(res.message).toContain('模型')
  })
})

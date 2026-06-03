import { describe, expect, it, vi } from 'vitest'
import { buildCustomSlashCommands } from '../../../src/slash-commands/dynamic-commands'

describe('buildCustomSlashCommands', () => {
  it('执行后返回 sendPrompt', async () => {
    const reserved = new Set<string>(['help'])
    const cmds = buildCustomSlashCommands(
      [{ name: 'create-proposals', path: '/x.md', description: '确认方案', source: 'user' }],
      async (_name, args) => ({
        ok: true,
        message: 'ok',
        sendPrompt: `body\n\n---\n\n用户补充：\n${args}`,
      }),
      reserved,
    )
    expect(cmds).toHaveLength(1)
    const res = await cmds[0]!.run(
      {
        projectRoot: '/p',
        getSession: () => null,
        setSession: () => {},
        persist: vi.fn(),
        newChat: vi.fn(),
        getModelsFile: () => ({ schemaVersion: 1, activeModelId: '', models: [] }),
        setModelsFile: () => {},
        setActiveModel: vi.fn(),
        openModelsSettings: vi.fn(),
      },
      '方案一',
    )
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.sendPrompt).toContain('方案一')
      expect(res.silent).toBe(true)
    }
  })
})

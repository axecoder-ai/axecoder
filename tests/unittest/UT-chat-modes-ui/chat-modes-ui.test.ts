import { describe, expect, it, vi } from 'vitest'
import {
  CHAT_MODE_OPTIONS,
  DEFAULT_CHAT_MODE,
  isChatModeId,
  loadStoredChatMode,
  normalizeChatModeFromStorage,
  resolveSessionChatMode,
} from '../../../src/utils/chat-modes'

describe('chat-modes UI', () => {
  it('UI 不再展示 auto-plan，仅保留 Agent', () => {
    const ids = CHAT_MODE_OPTIONS.map((m) => m.id)
    expect(ids).toContain('agent')
    expect(ids).not.toContain('auto-plan')
  })

  it('Agent 描述包含自动规划说明', () => {
    const agent = CHAT_MODE_OPTIONS.find((m) => m.id === 'agent')
    expect(agent?.description).toMatch(/auto-enter|自动/i)
  })

  it('isChatModeId 仍接受 auto-plan 以便迁移', () => {
    expect(isChatModeId('auto-plan')).toBe(true)
    expect(isChatModeId('agent')).toBe(true)
  })

  it('loadStoredChatMode 将 auto-plan 迁移为 agent', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
    store.set('axecoder.chatMode', 'auto-plan')
    expect(loadStoredChatMode()).toBe('agent')
    expect(store.get('axecoder.chatMode')).toBe('agent')
  })

  it('默认模式为 agent', () => {
    expect(DEFAULT_CHAT_MODE).toBe('agent')
  })

  it('Planning 模式 UI 显示为 Plan', () => {
    const plan = CHAT_MODE_OPTIONS.find((m) => m.id === 'plan')
    expect(plan?.label).toBe('Plan')
    expect(CHAT_MODE_OPTIONS.some((m) => m.id === 'planning')).toBe(false)
  })

  it('isChatModeId 仍接受 planning 以便迁移', () => {
    expect(isChatModeId('planning')).toBe(true)
    expect(isChatModeId('plan')).toBe(true)
  })

  it('loadStoredChatMode 将 planning 迁移为 plan', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
    store.set('axecoder.chatMode', 'planning')
    expect(loadStoredChatMode()).toBe('plan')
    expect(store.get('axecoder.chatMode')).toBe('plan')
  })

  it('Draw.IO 位于 Plan 与 Multi-Agent 之间', () => {
    const ids = CHAT_MODE_OPTIONS.map((m) => m.id)
    const planIdx = ids.indexOf('plan')
    const drawIdx = ids.indexOf('draw-io')
    const maIdx = ids.indexOf('multi-agent')
    expect(drawIdx).toBeGreaterThan(planIdx)
    expect(maIdx).toBeGreaterThan(drawIdx)
  })

  it('resolveSessionChatMode 优先使用 session 记录的模式', () => {
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v)
      },
      removeItem: (k: string) => {
        store.delete(k)
      },
    })
    store.set('axecoder.chatMode', 'agent')
    expect(resolveSessionChatMode({ chatMode: 'plan' })).toBe('plan')
    expect(resolveSessionChatMode({ chatMode: 'auto-plan' })).toBe('agent')
    expect(resolveSessionChatMode(null)).toBe('agent')
  })

  it('normalizeChatModeFromStorage 迁移旧模式', () => {
    expect(normalizeChatModeFromStorage('planning')).toBe('plan')
    expect(normalizeChatModeFromStorage('bogus')).toBeNull()
  })
})

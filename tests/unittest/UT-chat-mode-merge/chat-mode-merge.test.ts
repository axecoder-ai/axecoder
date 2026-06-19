import { describe, expect, it } from 'vitest'
import {
  applySwitchModeToSession,
  chatModeSystemAddon,
  normalizeChatMode,
  resolveSwitchModeTarget,
  shouldTriggerAutoPlanOnTurn,
} from '../../../electron/main/agent/chat-mode'
import type { StoredAgentSession } from '../../../electron/main/agent/agent-session-store'

describe('chat-mode merge: auto-plan into agent', () => {
  it('normalizeChatMode 将 auto-plan 映射为 agent', () => {
    expect(normalizeChatMode('auto-plan')).toBe('agent')
    expect(normalizeChatMode('agent')).toBe('agent')
  })

  it('normalizeChatMode 将 planning 映射为 plan', () => {
    expect(normalizeChatMode('planning')).toBe('plan')
    expect(normalizeChatMode('plan')).toBe('plan')
  })

  it('normalizeChatMode 将已下线的 reflection / rppit 映射为 agent', () => {
    expect(normalizeChatMode('reflection')).toBe('agent')
    expect(normalizeChatMode('rppit')).toBe('agent')
  })

  it('agent system addon 说明复杂任务可自动进规划', () => {
    const addon = chatModeSystemAddon('agent')
    expect(addon).toContain('auto-enter read-only plan mode')
    expect(addon).toContain('CreatePlan')
  })

  it('resolveSwitchModeTarget auto-plan 别名到 agent', () => {
    expect(resolveSwitchModeTarget('auto-plan')).toBe('agent')
    expect(resolveSwitchModeTarget('agent')).toBe('agent')
  })

  it('applySwitchModeToSession auto-plan 落到 agent', () => {
    const session = {
      planMode: true,
      ctx: { planMode: true },
      revealedToolNames: new Set<string>(),
      activeTools: [],
    } as unknown as StoredAgentSession
    const res = applySwitchModeToSession(session, 'auto-plan')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(session.chatMode).toBe('agent')
    expect(session.planMode).toBe(false)
  })

  it('shouldTriggerAutoPlanOnTurn 仅 agent + on 时触发', () => {
    const base = { planMode: false, bypass: false, hasUserMessage: true }
    expect(shouldTriggerAutoPlanOnTurn('agent', 'on', base)).toBe(true)
    expect(shouldTriggerAutoPlanOnTurn('agent', 'off', base)).toBe(false)
    expect(shouldTriggerAutoPlanOnTurn('plan', 'on', base)).toBe(false)
    expect(shouldTriggerAutoPlanOnTurn('agent', 'on', { ...base, planMode: true })).toBe(false)
    expect(shouldTriggerAutoPlanOnTurn('agent', 'on', { ...base, bypass: true })).toBe(false)
    expect(shouldTriggerAutoPlanOnTurn('agent', 'on', { ...base, hasUserMessage: false })).toBe(false)
  })
})

import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../electron/main/agent/agent-progress-emit', () => ({
  emitAgentProgress: vi.fn(),
}))

import { applySwitchModeToSession, resolveSwitchModeTarget } from '../../../electron/main/agent/chat-mode'
import { executeExtendedAgentTool } from '../../../electron/main/agent/agent-ext-executor'
import { buildFullAgentTools } from '../../../electron/main/agent/agent-tool-registry'
import { getSessionActiveTools } from '../../../electron/main/agent/agent-ext-executor'
import { putSession } from '../../../electron/main/agent/agent-session-store'
import type { StoredAgentSession } from '../../../electron/main/agent/agent-session-store'
import { createLoopGuardState } from '../../../electron/main/agent/agent-loop-guard'

const mkSession = (overrides: Partial<StoredAgentSession> = {}): StoredAgentSession => {
  const revealedToolNames = new Set<import('../../../electron/main/agent/agent-types').AgentToolName>()
  return {
    projectRoot: process.cwd(),
    modelId: 'm1',
    messages: [{ role: 'system', content: 'sys' }],
    ctx: { projectRoot: process.cwd(), readCache: new Set(), sessionId: 's-switch', planMode: false },
    toolLog: [],
    pendingById: new Map(),
    pendingBashById: new Map(),
    pendingAskById: new Map(),
    turn: 0,
    planMode: false,
    chatMode: 'agent',
    revealedToolNames,
    activeTools: getSessionActiveTools(buildFullAgentTools(), revealedToolNames),
    proactiveEnabled: false,
    proactiveTick: 0,
    scratchpadDir: '/tmp',
    compactedOnce: false,
    loopGuard: createLoopGuardState(),
    ...overrides,
  }
}

describe('switch-mode-tool', () => {
  it('resolveSwitchModeTarget 解析 Cursor 别名 plan', () => {
    expect(resolveSwitchModeTarget('plan')).toBe('planning')
    expect(resolveSwitchModeTarget('agent')).toBe('agent')
    expect(resolveSwitchModeTarget('planning-only')).toBeNull()
    expect(resolveSwitchModeTarget('reflection')).toBeNull()
    expect(resolveSwitchModeTarget('rppit')).toBeNull()
    expect(resolveSwitchModeTarget('nope')).toBeNull()
  })

  it('applySwitchModeToSession agent 清除 planMode', () => {
    const session = mkSession({ planMode: true, ctx: { projectRoot: process.cwd(), readCache: new Set(), sessionId: 's1', planMode: true } })
    const res = applySwitchModeToSession(session, 'agent')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(session.planMode).toBe(false)
    expect(session.ctx.planMode).toBe(false)
    expect(session.chatMode).toBe('agent')
  })

  it('applySwitchModeToSession plan 进入 planning + planMode', () => {
    const session = mkSession()
    const res = applySwitchModeToSession(session, 'plan')
    expect(res.ok).toBe(true)
    expect(session.planMode).toBe(true)
    expect(session.chatMode).toBe('planning')
  })

  it('applySwitchModeToSession 拒绝已禁用的 planning-only', () => {
    const session = mkSession()
    const res = applySwitchModeToSession(session, 'planning-only')
    expect(res.ok).toBe(false)
  })

  it('executeExtendedAgentTool SwitchMode 更新会话', async () => {
    const session = mkSession()
    putSession('s-switch', session)
    const ctx = { projectRoot: process.cwd(), readCache: new Set(), sessionId: 's-switch', planMode: false }
    const res = await executeExtendedAgentTool(ctx, {
      id: 'sm1',
      name: 'SwitchMode',
      arguments: { target_mode_id: 'plan' },
    })
    expect(res?.log.ok).toBe(true)
    expect(session.planMode).toBe(true)
    expect(session.chatMode).toBe('planning')
    expect(ctx.planMode).toBe(true)
  })

  it('executeExtendedAgentTool SwitchMode 拒绝非法 target', async () => {
    const session = mkSession()
    putSession('s-bad', session)
    const res = await executeExtendedAgentTool(
      { projectRoot: process.cwd(), readCache: new Set(), sessionId: 's-bad', planMode: false },
      { id: 'sm2', name: 'SwitchMode', arguments: { target_mode_id: 'multi-agent' } },
    )
    expect(res?.log.ok).toBe(false)
    expect(res?.content).toContain('Error')
  })
})

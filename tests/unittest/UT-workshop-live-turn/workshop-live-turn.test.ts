import { describe, expect, it } from 'vitest'
import {
  clearWorkshopLiveTurnState,
  createWorkshopLiveTurnState,
  markWorkshopAgentStreamKey,
  markWorkshopLiveRole,
} from '../../../src/utils/workshop-live-turn'

describe('workshop-live-turn', () => {
  it('workshop 角色变化时仅重置一次', () => {
    const s = createWorkshopLiveTurnState()
    expect(markWorkshopLiveRole(s, 'manager')).toBe(true)
    expect(markWorkshopLiveRole(s, 'manager')).toBe(false)
    expect(markWorkshopLiveRole(s, 'frontend')).toBe(true)
    expect(s.agentStreamKey).toBe(null)
  })

  it('agent 流 key 变化时标记重置', () => {
    const s = createWorkshopLiveTurnState()
    markWorkshopLiveRole(s, 'manager')
    expect(markWorkshopAgentStreamKey(s, 'u-mgr')).toBe(true)
    expect(markWorkshopAgentStreamKey(s, 'u-mgr')).toBe(false)
    expect(markWorkshopAgentStreamKey(s, 'u-fe')).toBe(true)
  })

  it('clearWorkshopLiveTurnState 清空跟踪', () => {
    const s = createWorkshopLiveTurnState()
    markWorkshopLiveRole(s, 'manager')
    markWorkshopAgentStreamKey(s, 'u-1')
    clearWorkshopLiveTurnState(s)
    expect(markWorkshopLiveRole(s, 'manager')).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { canPickChatMode } from '../../../src/utils/chat-modes'

describe('canPickChatMode', () => {
  it('allows any switch when session has no messages', () => {
    expect(canPickChatMode('agent', 'multi-agent', false)).toBe(true)
    expect(canPickChatMode('multi-agent', 'agent', false)).toBe(true)
  })

  it('blocks leaving multi-agent when session has messages', () => {
    expect(canPickChatMode('multi-agent', 'agent', true)).toBe(false)
    expect(canPickChatMode('multi-agent', 'planning', true)).toBe(false)
  })

  it('blocks entering multi-agent when session has messages', () => {
    expect(canPickChatMode('agent', 'multi-agent', true)).toBe(false)
    expect(canPickChatMode('rppit', 'multi-agent', true)).toBe(false)
  })

  it('allows switching between non-multi-agent modes with messages', () => {
    expect(canPickChatMode('agent', 'planning', true)).toBe(true)
    expect(canPickChatMode('planning', 'rppit', true)).toBe(true)
  })

  it('blocks disabled chat modes', () => {
    expect(canPickChatMode('agent', 'reflection', false)).toBe(false)
    expect(canPickChatMode('agent', 'planning-only', false)).toBe(false)
  })

  it('allows re-selecting current mode', () => {
    expect(canPickChatMode('multi-agent', 'multi-agent', true)).toBe(true)
  })
})

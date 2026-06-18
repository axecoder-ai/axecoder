import { describe, expect, it } from 'vitest'
import { canPickChatMode } from '../../../src/utils/chat-modes'

describe('canPickChatMode', () => {
  it('allows any switch when session has no messages', () => {
    expect(canPickChatMode('agent', 'multi-agent', false)).toBe(true)
    expect(canPickChatMode('multi-agent', 'agent', false)).toBe(true)
    expect(canPickChatMode('agent', 'reflection', false)).toBe(true)
    expect(canPickChatMode('reflection', 'multi-agent', false)).toBe(true)
  })

  it('blocks leaving multi-agent when session has messages', () => {
    expect(canPickChatMode('multi-agent', 'agent', true)).toBe(true)
    expect(canPickChatMode('multi-agent', 'plan', true)).toBe(true)
  })

  it('blocks entering multi-agent when session has messages', () => {
    expect(canPickChatMode('agent', 'multi-agent', true)).toBe(false)
    expect(canPickChatMode('rppit', 'multi-agent', true)).toBe(false)
  })

  it('blocks reflection and multi-agent cross-switch when session has messages', () => {
    expect(canPickChatMode('reflection', 'multi-agent', true)).toBe(false)
    expect(canPickChatMode('multi-agent', 'reflection', true)).toBe(false)
  })

  it('blocks entering reflection when session has messages', () => {
    expect(canPickChatMode('agent', 'reflection', true)).toBe(false)
  })

  it('allows switching between non-embedded modes with messages', () => {
    expect(canPickChatMode('agent', 'plan', true)).toBe(true)
    expect(canPickChatMode('plan', 'rppit', true)).toBe(true)
  })

  it('allows leaving reflection to agent when session has messages', () => {
    expect(canPickChatMode('reflection', 'agent', true)).toBe(true)
  })

  it('blocks disabled chat modes', () => {
    expect(canPickChatMode('agent', 'planning-only', false)).toBe(false)
  })

  it('allows re-selecting current mode', () => {
    expect(canPickChatMode('multi-agent', 'multi-agent', true)).toBe(true)
    expect(canPickChatMode('reflection', 'reflection', true)).toBe(true)
  })
})

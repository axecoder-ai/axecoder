import { describe, expect, it } from 'vitest'
import { canPickChatMode } from '../../../src/utils/chat-modes'

describe('canPickChatMode', () => {
  it('allows any switch when session has no messages', () => {
    expect(canPickChatMode('agent', 'multi-agent', false)).toBe(true)
    expect(canPickChatMode('multi-agent', 'agent', false)).toBe(true)
    expect(canPickChatMode('agent', 'software-company', false)).toBe(true)
    expect(canPickChatMode('software-company', 'multi-agent', false)).toBe(true)
  })

  it('blocks leaving multi-agent when session has messages', () => {
    expect(canPickChatMode('multi-agent', 'agent', true)).toBe(true)
    expect(canPickChatMode('multi-agent', 'plan', true)).toBe(true)
  })

  it('blocks entering multi-agent when session has messages', () => {
    expect(canPickChatMode('agent', 'multi-agent', true)).toBe(false)
    expect(canPickChatMode('plan', 'multi-agent', true)).toBe(false)
  })

  it('blocks multi-agent and software-company cross-switch when session has messages', () => {
    expect(canPickChatMode('multi-agent', 'software-company', true)).toBe(false)
    expect(canPickChatMode('software-company', 'multi-agent', true)).toBe(false)
  })

  it('blocks entering software-company when session has messages', () => {
    expect(canPickChatMode('agent', 'software-company', true)).toBe(false)
  })

  it('allows switching between non-embedded modes with messages', () => {
    expect(canPickChatMode('agent', 'plan', true)).toBe(true)
    expect(canPickChatMode('plan', 'agent', true)).toBe(true)
  })

  it('allows leaving software-company to agent when session has messages', () => {
    expect(canPickChatMode('software-company', 'agent', true)).toBe(true)
  })

  it('blocks disabled chat modes', () => {
    expect(canPickChatMode('agent', 'planning-only', false)).toBe(false)
  })

  it('blocks draw-io cross-switch when session has messages', () => {
    expect(canPickChatMode('draw-io', 'multi-agent', true)).toBe(false)
    expect(canPickChatMode('multi-agent', 'draw-io', true)).toBe(false)
    expect(canPickChatMode('agent', 'draw-io', true)).toBe(false)
    expect(canPickChatMode('draw-io', 'agent', true)).toBe(true)
  })
})

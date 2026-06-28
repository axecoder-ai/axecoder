import { describe, expect, it } from 'vitest'
import {
  newSessionPreferences,
  resolveSessionChatModeOnSwitch,
  resolveSessionModelIdOnSwitch,
  stampSessionPreferences,
} from '../../../src/utils/session-preferences'

describe('session-preferences', () => {
  it('resolveSessionChatModeOnSwitch 有记录时用 session', () => {
    expect(resolveSessionChatModeOnSwitch({ chatMode: 'plan' }, 'agent')).toBe('plan')
  })

  it('resolveSessionChatModeOnSwitch 无记录时保持当前 UI', () => {
    expect(resolveSessionChatModeOnSwitch({}, 'plan')).toBe('plan')
    expect(resolveSessionChatModeOnSwitch(null, 'draw-io')).toBe('draw-io')
  })

  it('resolveSessionModelIdOnSwitch 有记录时用 session', () => {
    expect(resolveSessionModelIdOnSwitch({ modelId: 'm1' }, 'm2')).toBe('m1')
  })

  it('resolveSessionModelIdOnSwitch 无记录时保持当前 UI', () => {
    expect(resolveSessionModelIdOnSwitch({}, 'm2')).toBe('m2')
  })

  it('stampSessionPreferences 写入 chatMode 与 modelId', () => {
    const s: { chatMode?: string; modelId?: string } = {}
    stampSessionPreferences(s, 'plan', 'm1')
    expect(s.chatMode).toBe('plan')
    expect(s.modelId).toBe('m1')
  })

  it('newSessionPreferences 使用 Agent 与全局默认模型', () => {
    expect(newSessionPreferences('default-m')).toEqual({
      chatMode: 'agent',
      modelId: 'default-m',
    })
  })
})

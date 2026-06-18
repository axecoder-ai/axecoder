import { describe, expect, it } from 'vitest'
import {
  agentAutoPlanSetting,
  isAgentAutoPlanOn,
} from '../../../src/utils/chat-modes'

describe('agent-auto-plan-toggle', () => {
  it('isAgentAutoPlanOn 默认与 on 为开启', () => {
    expect(isAgentAutoPlanOn(undefined)).toBe(true)
    expect(isAgentAutoPlanOn('on')).toBe(true)
    expect(isAgentAutoPlanOn('off')).toBe(false)
  })

  it('agentAutoPlanSetting 与布尔互转', () => {
    expect(agentAutoPlanSetting(true)).toBe('on')
    expect(agentAutoPlanSetting(false)).toBe('off')
  })
})

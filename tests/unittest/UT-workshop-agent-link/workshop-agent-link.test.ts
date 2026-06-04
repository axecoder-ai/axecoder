import { describe, expect, it } from 'vitest'
import {
  isAgentLinkedWorkshopId,
  workshopIdForAgentChat,
} from '../../../src/utils/workshop-agent-link'

describe('workshop-agent-link', () => {
  it('maps agent chat id to stable workshop id', () => {
    expect(workshopIdForAgentChat('chat-1')).toBe('ma-chat-1')
  })

  it('detects agent-linked workshop ids', () => {
    expect(isAgentLinkedWorkshopId('ma-chat-1')).toBe(true)
    expect(isAgentLinkedWorkshopId('ws-standalone')).toBe(false)
  })
})

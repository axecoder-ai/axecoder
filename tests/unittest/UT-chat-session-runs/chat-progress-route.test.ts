import { describe, expect, it } from 'vitest'
import { resolveProgressChatId } from '../../../src/utils/chat-progress-route'

describe('resolveProgressChatId', () => {
  it('优先使用 clientChatId', () => {
    expect(
      resolveProgressChatId(
        { sessionId: 'agent-1', clientChatId: 'chat-a' },
        { 'agent-1': 'chat-b' },
      ),
    ).toBe('chat-a')
  })

  it('无 clientChatId 时回退 agentToChat', () => {
    expect(
      resolveProgressChatId({ sessionId: 'agent-2' }, { 'agent-2': 'chat-x' }),
    ).toBe('chat-x')
  })

  it('未映射且无 clientChatId 时返回 undefined', () => {
    expect(resolveProgressChatId({ sessionId: 'agent-3' }, {})).toBeUndefined()
  })
})

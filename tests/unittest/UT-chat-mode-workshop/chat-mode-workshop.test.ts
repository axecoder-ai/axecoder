import { describe, expect, it } from 'vitest'
import {
  applyChatModeToNewSession,
  chatModeSystemAddon,
} from '../../../electron/main/agent/chat-mode'
import type { StoredAgentSession } from '../../../electron/main/agent/agent-session-store'

const emptySession = (): StoredAgentSession =>
  ({
    revealedToolNames: new Set<string>(),
    activeTools: [],
    planMode: false,
    ctx: { planMode: false },
  }) as unknown as StoredAgentSession

describe('chat-mode multi-agent (in-session)', () => {
  it('system addon points to Workshop not Task', () => {
    expect(chatModeSystemAddon('multi-agent')).toContain('Workshop')
    expect(chatModeSystemAddon('multi-agent')).not.toContain('Task tool')
  })

  it('does not reveal Task/Agent for multi-agent agent session', () => {
    const session = emptySession()
    applyChatModeToNewSession(session, 'multi-agent')
    expect(session.revealedToolNames.has('Task')).toBe(false)
    expect(session.revealedToolNames.has('Agent')).toBe(false)
  })
})

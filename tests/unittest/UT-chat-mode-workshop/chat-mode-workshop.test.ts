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
  it('system addon encourages Task tool delegation', () => {
    expect(chatModeSystemAddon('multi-agent')).toContain('Task tool')
  })

  it('reveals Task tool for multi-agent', () => {
    const session = emptySession()
    applyChatModeToNewSession(session, 'multi-agent')
    expect(session.revealedToolNames.has('Task')).toBe(true)
  })
})

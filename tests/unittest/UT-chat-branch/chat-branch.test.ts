import { describe, expect, it } from 'vitest'
import {
  messageIndexAtUserTurn,
  parseBranchArgs,
  resolveBranchRef,
} from '../../../electron/main/chat-branch'

describe('chat-branch', () => {
  it('parseBranchArgs 解析 turn 与名称', () => {
    expect(parseBranchArgs('')).toEqual({ fromTurn: false, turn: 0, name: '' })
    expect(parseBranchArgs('try-alt')).toEqual({ fromTurn: false, turn: 0, name: 'try-alt' })
    expect(parseBranchArgs('3 alt-name')).toEqual({ fromTurn: true, turn: 3, name: 'alt-name' })
  })

  it('messageIndexAtUserTurn 定位 user 消息', () => {
    const messages = [
      { role: 'user' as const, text: 'a' },
      { role: 'assistant' as const, text: 'b' },
      { role: 'user' as const, text: 'c' },
    ]
    expect(messageIndexAtUserTurn(messages, 1)).toBe(0)
    expect(messageIndexAtUserTurn(messages, 2)).toBe(2)
    expect(messageIndexAtUserTurn(messages, 9)).toBe(3)
  })

  it('resolveBranchRef 按 id 或前缀匹配', () => {
    const branches = [
      {
        id: 'chat-123-abc',
        title: 'Main',
        messageCount: 2,
        preview: 'hi',
        createdAt: 1,
        updatedAt: 1,
      },
    ]
    expect(resolveBranchRef(branches, 'chat-123-abc')?.id).toBe('chat-123-abc')
    expect(resolveBranchRef(branches, 'chat-123')?.id).toBe('chat-123-abc')
  })
})

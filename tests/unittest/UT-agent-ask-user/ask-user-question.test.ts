import { describe, expect, it } from 'vitest'
import { AGENT_TOOLS } from '../../../electron/main/agent/agent-tool-defs'
import {
  normalizeAgentToolCall,
  normalizeToolArguments,
  resolveAgentToolName,
} from '../../../electron/main/agent/agent-tool-aliases'
import { parseAskUserQuestions } from '../../../electron/main/agent/tool-executor'

describe('AskUserQuestion tool', () => {
  it('已注册 AskUserQuestion', () => {
    expect(AGENT_TOOLS.map((t) => t.name)).toContain('AskUserQuestion')
  })

  it('AskQuestion 别名为 AskUserQuestion', () => {
    expect(resolveAgentToolName('AskQuestion')).toBe('AskUserQuestion')
    expect(
      normalizeAgentToolCall({
        id: 'tc-1',
        name: 'AskQuestion' as 'AskUserQuestion',
        arguments: { questions: [] },
      }).name,
    ).toBe('AskUserQuestion')
  })

  it('unwrap raw_arguments JSON string', () => {
    expect(
      normalizeToolArguments({
        raw_arguments: JSON.stringify({ command: 'ls', description: 'list' }),
      }),
    ).toEqual({ command: 'ls', description: 'list' })
    expect(
      normalizeAgentToolCall({
        id: 'tc-2',
        name: 'Bash',
        arguments: { raw_arguments: '{"pattern":"**/*.go"}' },
      }).arguments,
    ).toEqual({ pattern: '**/*.go' })
  })
})

describe('parseAskUserQuestions', () => {
  it('接受合法 questions', () => {
    const res = parseAskUserQuestions([
      {
        id: 'q1',
        prompt: 'Pick one',
        options: [
          { id: 'a', label: 'A' },
          { id: 'b', label: 'B' },
        ],
      },
    ])
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.questions).toHaveLength(1)
      expect(res.questions[0].id).toBe('q1')
    }
  })

  it('拒绝空数组与选项不足', () => {
    expect(parseAskUserQuestions([]).ok).toBe(false)
    expect(
      parseAskUserQuestions([{ id: 'q', prompt: 'x', options: [{ id: 'a', label: 'A' }] }]).ok,
    ).toBe(false)
  })
})

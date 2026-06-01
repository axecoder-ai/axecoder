import { describe, expect, it } from 'vitest'
import { AGENT_TOOLS } from '../../../electron/main/agent/agent-tool-defs'
import { parseAskUserQuestions } from '../../../electron/main/agent/tool-executor'

describe('AskUserQuestion tool', () => {
  it('已注册 AskUserQuestion', () => {
    expect(AGENT_TOOLS.map((t) => t.name)).toContain('AskUserQuestion')
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

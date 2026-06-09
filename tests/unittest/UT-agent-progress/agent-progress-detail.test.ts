import { describe, expect, it } from 'vitest'
import {
  formatModelCallDetail,
  formatToolResultDetail,
  truncateProgressDetail,
} from '../../../electron/main/agent/agent-progress-detail'

describe('agent-progress-detail', () => {
  it('truncates long text', () => {
    const long = 'x'.repeat(5000)
    const out = truncateProgressDetail(long, 100)
    expect(out.length).toBeLessThan(200)
    expect(out).toContain('more chars')
  })

  it('formats model call with content and tool_calls', () => {
    const out = formatModelCallDetail({
      text: 'hi',
      content: 'hi',
      reasoningContent: 'think',
      toolCalls: [{ id: '1', name: 'Read', arguments: { path: 'a.md' } }],
    })
    expect(out).toContain('reasoning')
    expect(out).toContain('content')
    expect(out).toContain('tool_calls')
    expect(out).toContain('Read')
  })

  it('formats empty tool result', () => {
    expect(formatToolResultDetail('')).toContain('empty')
  })
})

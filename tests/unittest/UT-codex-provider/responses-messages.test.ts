import { describe, expect, it } from 'vitest'
import {
  agentLoopToResponsesInput,
  aiChatToResponsesInput,
  parseResponsesOutput,
} from '../../../electron/main/ai/responses-messages'

describe('aiChatToResponsesInput', () => {
  it('system 映射为 developer', () => {
    const input = aiChatToResponsesInput([{ role: 'system', content: 'sys' }])
    expect(input[0]).toMatchObject({ type: 'message', role: 'developer' })
  })
})

describe('agentLoopToResponsesInput', () => {
  it('assistant 工具调用与 tool 结果', () => {
    const input = agentLoopToResponsesInput([
      { role: 'system', content: 's' },
      { role: 'user', content: 'u' },
      {
        role: 'assistant',
        content: 'calling',
        toolCalls: [{ id: 'c1', name: 'Read', arguments: { file_path: '/a' } }],
      },
      { role: 'tool', toolCallId: 'c1', content: 'file body' },
    ])
    expect(input).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'function_call', call_id: 'c1', name: 'Read' }),
        expect.objectContaining({ type: 'function_call_output', call_id: 'c1', output: 'file body' }),
      ]),
    )
  })
})

describe('parseResponsesOutput', () => {
  it('解析 message、reasoning、function_call', () => {
    const parsed = parseResponsesOutput([
      {
        type: 'message',
        role: 'assistant',
        content: [{ type: 'output_text', text: 'hello' }],
      },
      {
        type: 'reasoning',
        summary: [{ type: 'summary_text', text: 'think' }],
      },
      {
        type: 'function_call',
        call_id: 'c1',
        name: 'Glob',
        arguments: '{"glob_pattern":"*.ts"}',
      },
    ])
    expect(parsed.content).toBe('hello')
    expect(parsed.reasoningContent).toBe('think')
    expect(parsed.toolCalls[0]?.name).toBe('Glob')
  })
})

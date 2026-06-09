import { describe, it, expect } from 'vitest'
import { detectThinkingType } from '../thinking-detector'

describe('detectThinkingType', () => {
  it('should detect tool_call when text contains <function_calls>', () => {
    const text = '<function_calls><invoke name="Read">...</invoke></function_calls>'
    expect(detectThinkingType(text)).toBe('tool_call')
  })

  it('should detect tool_call when text contains <invoke', () => {
    const text = 'Let me <invoke name="Grep">'
    expect(detectThinkingType(text)).toBe('tool_call')
  })

  it('should detect tool_result when text contains <function_results>', () => {
    const text = '<function_results>File content here</function_results>'
    expect(detectThinkingType(text)).toBe('tool_result')
  })

  it('should detect tool_result when text contains </invoke>', () => {
    const text = 'Result data</invoke>'
    expect(detectThinkingType(text)).toBe('tool_result')
  })

  it('should detect reasoning for plain text', () => {
    const text = 'I need to analyze this problem carefully...'
    expect(detectThinkingType(text)).toBe('reasoning')
  })

  it('should handle empty string as reasoning', () => {
    expect(detectThinkingType('')).toBe('reasoning')
  })

  it('should prioritize tool_call over tool_result', () => {
    const text = '<function_calls><invoke>...</invoke></function_calls><function_results>...</function_results>'
    expect(detectThinkingType(text)).toBe('tool_call')
  })
})

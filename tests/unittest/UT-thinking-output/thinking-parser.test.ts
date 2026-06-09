import { describe, it, expect } from 'vitest'
import { parseToolCall, parseToolResult, formatToolCall, detectThinkingType } from '@/utils/thinking-parser'

describe('detectThinkingType', () => {
  it('should detect tool_call', () => {
    expect(detectThinkingType('<invoke name="Read">')).toBe('tool_call')
  })

  it('should detect tool_result', () => {
    expect(detectThinkingType('<function_results>ok</function_results>')).toBe('tool_result')
  })

  it('should default to reasoning', () => {
    expect(detectThinkingType('planning next step')).toBe('reasoning')
  })
})

describe('parseToolCall', () => {
  it('should parse simple tool call', () => {
    const xml = '<invoke name="Read"><parameter name="file_path">test.ts</parameter></invoke>'
    const result = parseToolCall(xml)
    
    expect(result).not.toBeNull()
    expect(result?.toolName).toBe('Read')
    expect(result?.parameters).toHaveLength(1)
    expect(result?.parameters[0].name).toBe('file_path')
    expect(result?.parameters[0].value).toBe('test.ts')
  })

  it('should parse tool call with multiple parameters', () => {
    const xml = `<invoke name="Edit">
      <parameter name="file_path">src/test.ts</parameter>
      <parameter name="old_string">old code</parameter>
      <parameter name="new_string">new code</parameter>
    </invoke>`
    
    const result = parseToolCall(xml)
    
    expect(result).not.toBeNull()
    expect(result?.toolName).toBe('Edit')
    expect(result?.parameters).toHaveLength(3)
  })

  it('should return null for invalid XML', () => {
    const xml = 'not valid xml'
    expect(parseToolCall(xml)).toBeNull()
  })

  it('should return null when no invoke tag', () => {
    const xml = '<parameter name="test">value</parameter>'
    expect(parseToolCall(xml)).toBeNull()
  })
})

describe('parseToolResult', () => {
  it('should extract content from function_results tag', () => {
    const xml = '<function_results>File content here</function_results>'
    const result = parseToolResult(xml)
    
    expect(result).toBe('File content here')
  })

  it('should handle multiline content', () => {
    const xml = `<function_results>
Line 1
Line 2
Line 3
</function_results>`
    
    const result = parseToolResult(xml)
    expect(result).toContain('Line 1')
    expect(result).toContain('Line 2')
  })

  it('should return original text if no function_results tag', () => {
    const xml = 'plain text result'
    expect(parseToolResult(xml)).toBe('plain text result')
  })

  it('should trim whitespace', () => {
    const xml = '<function_results>  content  </function_results>'
    expect(parseToolResult(xml)).toBe('content')
  })
})

describe('formatToolCall', () => {
  it('should format tool call with parameters', () => {
    const toolCall = {
      toolName: 'Read',
      parameters: [
        { name: 'file_path', value: 'src/test.ts' }
      ]
    }
    
    const result = formatToolCall(toolCall)
    
    expect(result).toContain('Read')
    expect(result).toContain('file_path')
    expect(result).toContain('src/test.ts')
  })

  it('should truncate long parameter values', () => {
    const longValue = 'a'.repeat(200)
    const toolCall = {
      toolName: 'Write',
      parameters: [
        { name: 'content', value: longValue }
      ]
    }
    
    const result = formatToolCall(toolCall)
    
    expect(result).toContain('...')
    expect(result.length).toBeLessThan(longValue.length)
  })

  it('should handle no parameters', () => {
    const toolCall = {
      toolName: 'Bash',
      parameters: []
    }
    
    const result = formatToolCall(toolCall)
    
    expect(result).toContain('Bash')
    expect(result).toContain('无参数')
  })
})

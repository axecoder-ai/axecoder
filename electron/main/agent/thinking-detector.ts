/**
 * 检测 thinking 内容类型
 */
export function detectThinkingType(text: string): 'tool_call' | 'tool_result' | 'reasoning' {
  if (text.includes('<function_calls>') || text.includes('<invoke')) {
    return 'tool_call'
  }
  if (text.includes('<function_results>') || text.includes('</invoke>')) {
    return 'tool_result'
  }
  return 'reasoning'
}

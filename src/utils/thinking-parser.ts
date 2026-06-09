import type { ToolCall } from '../types/thinking'

export type ThinkingContentType = 'tool_call' | 'tool_result' | 'reasoning'

/** 检测 thinking 文本类型（与 electron/main/agent/thinking-detector 保持一致） */
export function detectThinkingType(text: string): ThinkingContentType {
  if (text.includes('<function_calls>') || text.includes('<invoke')) {
    return 'tool_call'
  }
  if (text.includes('<function_results>') || text.includes('</invoke>')) {
    return 'tool_result'
  }
  return 'reasoning'
}

/**
 * 解析工具调用 XML
 */
export function parseToolCall(xml: string): ToolCall | null {
  try {
    const nameMatch = xml.match(/<invoke name="(.+?)">/i)
    if (!nameMatch) return null

    const toolName = nameMatch[1]
    const parameters: Array<{ name: string; value: string }> = []

    // 匹配所有 parameter 标签（支持有无 antml: 前缀）
    const paramRegex = /<(?:antml:)?parameter name="(.+?)">([\s\S]*?)<\/(?:antml:)?parameter>/gi
    let match: RegExpExecArray | null

    while ((match = paramRegex.exec(xml)) !== null) {
      parameters.push({
        name: match[1],
        value: match[2],
      })
    }

    return { toolName, parameters }
  } catch {
    return null
  }
}

/**
 * 解析工具结果 XML
 */
export function parseToolResult(xml: string): string {
  try {
    const match = xml.match(/<function_results>([\s\S]*?)<\/function_results>/i)
    if (match) {
      return match[1].trim()
    }
    return xml
  } catch {
    return xml
  }
}

/**
 * 格式化工具调用为可读文本
 */
export function formatToolCall(toolCall: ToolCall): string {
  const params = toolCall.parameters
    .map((p) => `  ${p.name}: ${p.value.slice(0, 100)}${p.value.length > 100 ? '...' : ''}`)
    .join('\n')

  return `调用工具: ${toolCall.toolName}\n${params || '  (无参数)'}`
}

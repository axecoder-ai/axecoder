/** 解析 OpenAI 兼容 SSE（data: {...}）流 */
export const consumeOpenAiSse = async (
  res: Response,
  onEvent: (obj: Record<string, unknown>) => void,
): Promise<void> => {
  if (!res.body) throw new Error('Response has no body')
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data:')) continue
      const data = trimmed.slice(5).trim()
      if (!data || data === '[DONE]') continue
      try {
        onEvent(JSON.parse(data) as Record<string, unknown>)
      } catch {
        /* 忽略坏行 */
      }
    }
  }
}

export type OpenAiStreamAccum = {
  content: string
  reasoningContent: string
  toolCalls: Map<number, { id: string; name: string; arguments: string }>
}

export const emptyOpenAiStreamAccum = (): OpenAiStreamAccum => ({
  content: '',
  reasoningContent: '',
  toolCalls: new Map(),
})

const pickDelta = (obj: Record<string, unknown>): Record<string, unknown> | undefined => {
  const choices = obj.choices
  if (!Array.isArray(choices) || !choices.length) return undefined
  const choice = choices[0] as Record<string, unknown>
  const delta = choice.delta
  return delta && typeof delta === 'object' ? (delta as Record<string, unknown>) : undefined
}

/** 合并一条 SSE chunk，返回本次新增的可见Text片段 */
export const mergeOpenAiStreamChunk = (
  accum: OpenAiStreamAccum,
  obj: Record<string, unknown>,
): { contentDelta: string; reasoningDelta: string } => {
  const delta = pickDelta(obj)
  if (!delta) return { contentDelta: '', reasoningDelta: '' }

  const prevContent = accum.content
  const prevReasoning = accum.reasoningContent

  const c = delta.content
  if (typeof c === 'string' && c) accum.content += c
  const r = delta.reasoning_content
  if (typeof r === 'string' && r) accum.reasoningContent += r

  const rawTools = delta.tool_calls
  if (Array.isArray(rawTools)) {
    for (const item of rawTools) {
      const row = item as Record<string, unknown>
      const idx = typeof row.index === 'number' ? row.index : 0
      let slot = accum.toolCalls.get(idx)
      if (!slot) {
        slot = { id: '', name: '', arguments: '' }
        accum.toolCalls.set(idx, slot)
      }
      if (typeof row.id === 'string' && row.id) slot.id = row.id
      const fn = row.function as Record<string, unknown> | undefined
      if (fn) {
        if (typeof fn.name === 'string' && fn.name) slot.name = fn.name
        if (typeof fn.arguments === 'string') slot.arguments += fn.arguments
      }
    }
  }

  return {
    contentDelta: accum.content.slice(prevContent.length),
    reasoningDelta: accum.reasoningContent.slice(prevReasoning.length),
  }
}

export const openAiStreamAccumToMessage = (accum: OpenAiStreamAccum): Record<string, unknown> => {
  const message: Record<string, unknown> = {
    content: accum.content,
  }
  if (accum.reasoningContent.trim()) message.reasoning_content = accum.reasoningContent
  if (accum.toolCalls.size) {
    const tool_calls = [...accum.toolCalls.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, slot]) => ({
        id: slot.id,
        type: 'function',
        function: { name: slot.name, arguments: slot.arguments },
      }))
    message.tool_calls = tool_calls
  }
  return message
}

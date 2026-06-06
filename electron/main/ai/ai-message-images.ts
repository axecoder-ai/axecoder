import type { AiChatImagePart, AiChatMessage } from '../models-types'
import type { AgentLoopMessage } from '../agent/agent-types'

export const messageHasImages = (m: AiChatMessage) =>
  m.role === 'user' && Array.isArray(m.images) && m.images.length > 0

export const anyMessageHasImages = (messages: AiChatMessage[]) => messages.some(messageHasImages)

export const lastUserMessageHasImages = (messages: AiChatMessage[]) => {
  const last = [...messages].reverse().find((m) => m.role === 'user')
  return !!last && messageHasImages(last)
}

/** 非视觉模型：历史中的图片从 API 载荷剥离，仅保留文本占位 */
export const stripImagesFromMessages = (messages: AiChatMessage[]): AiChatMessage[] =>
  messages.map((m) => {
    if (m.role !== 'user' || !m.images?.length) return m
    const { images: _images, ...rest } = m
    return { ...rest, content: m.content.trim() || userTextContent('') }
  })

export const lastAgentUserMessageHasImages = (messages: AgentLoopMessage[]) => {
  const last = [...messages].reverse().find((m) => m.role === 'user')
  return !!last && last.role === 'user' && !!last.images?.length
}

export const stripImagesFromAgentMessages = (messages: AgentLoopMessage[]): AgentLoopMessage[] =>
  messages.map((m) => {
    if (m.role !== 'user' || !m.images?.length) return m
    const { images: _images, ...rest } = m
    return { ...rest, content: m.content.trim() || userTextContent('') }
  })

export const userTextContent = (content: string) => content || 'Describe or analyze the attached image(s).'

/** OpenAI Chat Completions 多模态 user content */
export const userMessageToOpenAiContent = (
  text: string,
  images?: AiChatImagePart[],
): string | Record<string, unknown>[] => {
  if (!images?.length) return text
  const parts: Record<string, unknown>[] = []
  const t = text.trim()
  if (t) parts.push({ type: 'text', text: t })
  else parts.push({ type: 'text', text: userTextContent('') })
  for (const img of images) {
    const mime = img.mimeType || 'image/png'
    parts.push({
      type: 'image_url',
      image_url: { url: `data:${mime};base64,${img.data}` },
    })
  }
  return parts
}

/** Anthropic Messages API user content blocks */
export const userMessageToAnthropicContent = (
  text: string,
  images?: AiChatImagePart[],
): string | Record<string, unknown>[] => {
  if (!images?.length) return text
  const blocks: Record<string, unknown>[] = []
  const t = text.trim()
  blocks.push({ type: 'text', text: t || userTextContent('') })
  for (const img of images) {
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: img.mimeType || 'image/png',
        data: img.data,
      },
    })
  }
  return blocks
}

/** Ollama 部分视觉模型：messages[].images */
export const userMessageToOllamaRow = (
  text: string,
  images?: AiChatImagePart[],
): { role: 'user'; content: string; images?: string[] } => {
  const row: { role: 'user'; content: string; images?: string[] } = {
    role: 'user',
    content: text.trim() || userTextContent(''),
  }
  if (images?.length) {
    row.images = images.map((img) => img.data)
  }
  return row
}

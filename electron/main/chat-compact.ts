import type { AiChatMessage } from './models-types'

/** 聊天会话压缩（Renderer /compact） */
export const compactChatHistory = (
  messages: AiChatMessage[],
  keepTail = 20,
): { messages: AiChatMessage[]; summary: string } => {
  if (messages.length <= keepTail) {
    return { messages: [...messages], summary: '' }
  }
  const tail = messages.slice(-keepTail)
  const dropped = messages.length - keepTail
  const summary = `Removed ${dropped} older messages from context. Re-attach files if needed.`
  const notice: AiChatMessage = {
    role: 'user',
    content: `<system-reminder>Chat compacted. ${summary}</system-reminder>`,
  }
  return { messages: [notice, ...tail], summary }
}

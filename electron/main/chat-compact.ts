import type { AiChatMessage } from './models-types'
import {
  compactAgentMessagesWithLlm,
  type CompactLlmOpts,
} from './agent/agent-context-compact'
import type { AgentLoopMessage } from './agent/agent-types'

const toAgentMessages = (messages: AiChatMessage[]): AgentLoopMessage[] =>
  messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

const toChatMessages = (messages: AgentLoopMessage[]): AiChatMessage[] =>
  messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content ?? '',
    }))

/** 聊天会话压缩（Renderer /compact）— 规则回退 */
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

/** 聊天会话 LLM 摘要压缩；无 modelId 或 LLM 失败时回退规则版 */
export const compactChatHistoryWithLlm = async (
  messages: AiChatMessage[],
  keepTail = 20,
  llmOpts?: CompactLlmOpts,
): Promise<{ messages: AiChatMessage[]; summary: string; usedLlm: boolean }> => {
  if (messages.length <= keepTail) {
    return { messages: [...messages], summary: '', usedLlm: false }
  }
  if (!llmOpts?.modelId?.trim()) {
    const rule = compactChatHistory(messages, keepTail)
    return { ...rule, usedLlm: false }
  }
  const agentMsgs = toAgentMessages(messages)
  const result = await compactAgentMessagesWithLlm(agentMsgs, keepTail, llmOpts)
  if (!result.usedLlm) {
    const rule = compactChatHistory(messages, keepTail)
    return { ...rule, usedLlm: false }
  }
  return {
    messages: toChatMessages(result.messages),
    summary: result.summary,
    usedLlm: true,
  }
}

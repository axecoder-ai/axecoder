import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithProvider } from '../ai/chat-with-provider'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'
import { modelTaskKindForWorkshopRole } from '../ai/model-resolve'
import type { RoleSpeaker } from './workshop-types'
import { roleDefById } from './workshop-roles'
import { buildWorkshopStreamId } from './workshop-stream'

const extractSummary = (raw: string): string => {
  const t = raw.trim()
  if (!t) return '（无结论）'
  const jsonMatch = t.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const o = JSON.parse(jsonMatch[0]) as {
        summary?: string
        needsUser?: boolean
        userQuestion?: string
        relatedFiles?: string[]
      }
      if (typeof o.summary === 'string' && o.summary.trim()) {
        return o.summary.trim()
      }
    } catch {
      /* */
    }
  }
  return t.slice(0, 800)
}

export const buildLlmRoleSpeaker = (
  modelId: string,
  workshopId: string,
  onStreamDelta?: (streamId: string, delta: string) => void,
): RoleSpeaker => {
  return async (input) => {
    const model = await getModelById(modelId)
    if (!model) throw new Error('模型不存在')
    const apiKey = await getSecret(modelId)
    const role = roleDefById(input.roleId)
    const name = role?.name ?? input.roleId
    const system = [
      `你是 Collab Workshop 中的「${name}」。`,
      '与主聊天纯对话模式相同：用简洁中文直接回答，不要调用工具。',
      '优先输出 JSON（便于解析），格式：',
      '{"summary":"核心结论","needsUser":false,"userQuestion":"","relatedFiles":[]}',
      'needsUser 仅在必须向用户澄清时为 true；无法从上下文推断时可设 true。',
      '不要输出 markdown 代码块包裹 JSON。',
    ].join('\n')
    const user = [
      `用户需求：${input.userBrief}`,
      input.priorSummary ? `此前讨论：\n${input.priorSummary}` : '',
      '请给出你的核心结论。',
    ]
      .filter(Boolean)
      .join('\n\n')
    const streamId = buildWorkshopStreamId(workshopId, input.roleId)
    const onDelta =
      onStreamDelta && model.provider === 'openai'
        ? (delta: { content?: string; reasoning?: string }) => {
            const text = (delta.content ?? '') + (delta.reasoning ?? '')
            if (text) onStreamDelta(streamId, text)
          }
        : undefined
    const taskKind = modelTaskKindForWorkshopRole(input.roleId, input.speakMode)
    const apiModelId = await resolveApiModelIdForTask(model, taskKind, user)
    const res = await chatWithProvider(
      model,
      apiKey,
      [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      onDelta,
      apiModelId,
    )
    if (!res.ok) throw new Error(res.error)
    let needsUser = false
    let userQuestion = ''
    let relatedFiles: string[] | undefined
    try {
      const jsonMatch = res.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const o = JSON.parse(jsonMatch[0]) as {
          summary?: string
          needsUser?: boolean
          userQuestion?: string
          relatedFiles?: string[]
        }
        needsUser = !!o.needsUser
        userQuestion = typeof o.userQuestion === 'string' ? o.userQuestion : ''
        if (Array.isArray(o.relatedFiles)) {
          relatedFiles = o.relatedFiles.filter((x) => typeof x === 'string' && x.trim())
        }
        return {
          summary: extractSummary(o.summary ?? res.text),
          needsUser,
          userQuestion,
          relatedFiles,
        }
      }
    } catch {
      /* */
    }
    return { summary: extractSummary(res.text) }
  }
}

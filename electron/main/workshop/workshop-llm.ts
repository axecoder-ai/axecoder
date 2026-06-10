import { getModelById } from '../models-store'
import { providerSupportsSseStream } from '../models-types'
import { getSecret } from '../secrets-store'
import { chatWithProvider } from '../ai/chat-with-provider'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'
import { modelTaskKindForWorkshopRole } from '../ai/model-resolve'
import type { RoleSpeaker } from './workshop-types'
import { buildWorkshopStreamId } from './workshop-stream'

const extractSummary = (raw: string): string => {
  const t = raw.trim()
  if (!t) return '(no conclusion)'
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
  getUserImages: () => import('../models-types').AiChatImagePart[] | undefined,
  onStreamDelta?: (streamId: string, delta: string) => void,
): RoleSpeaker => {
  return async (input) => {
    const model = await getModelById(modelId)
    if (!model) throw new Error('Model not found')
    const apiKey = await getSecret(modelId)
    const name = input.assigneeUser?.displayName?.trim() || input.roleId
    const system = [
      `You are Collab Workshop member "${name}".`,
      'Same as main chat Q&A: answer concisely in English; do not call tools.',
      'Prefer JSON output for parsing:',
      '{"summary":"core conclusion","needsUser":false,"userQuestion":"","relatedFiles":[]}',
      'Set needsUser true only when user clarification is required.',
      'Do not wrap JSON in markdown code fences.',
    ].join('\n')
    const user = [
      `User request: ${input.userBrief}`,
      input.priorSummary ? `Prior discussion:
\n${input.priorSummary}` : '',
      'Give your core conclusion.',
    ]
      .filter(Boolean)
      .join('\n\n')
    const streamId = buildWorkshopStreamId(workshopId, input.roleId)
    const onDelta =
      onStreamDelta && providerSupportsSseStream(model.provider)
        ? (delta: { content?: string; reasoning?: string }) => {
            const text = delta.content ?? ''
            if (text) onStreamDelta(streamId, text)
          }
        : undefined
    const taskKind = modelTaskKindForWorkshopRole(input.roleId, input.speakMode)
    const apiModelId = await resolveApiModelIdForTask(model, taskKind, user)
    const images = getUserImages()
    const res = await chatWithProvider(
      model,
      apiKey,
      [
        { role: 'system', content: system },
        { role: 'user', content: user, ...(images?.length ? { images } : {}) },
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

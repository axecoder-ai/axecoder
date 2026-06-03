import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithProvider } from '../ai/chat-with-provider'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'
import type { UserEntry } from '../users-types'
import { priorSummaryFromMessages } from './workshop-api-messages'
import type { RouterLLM } from './workshop-router'

export const buildWorkshopRouterLlm = (modelId: string): RouterLLM => {
  return async (prompt: string) => {
    const model = await getModelById(modelId)
    if (!model) throw new Error('模型不存在')
    const apiKey = await getSecret(modelId)
    const apiModelId = await resolveApiModelIdForTask(model, 'main', prompt)
    const res = await chatWithProvider(
      model,
      apiKey,
      [
        {
          role: 'system',
          content:
            '你是 Collab Workshop 调度器。严格按用户要求只输出 JSON，不要 markdown 说明或英文思考。',
        },
        { role: 'user', content: prompt },
      ],
      undefined,
      apiModelId,
    )
    if (!res.ok) throw new Error(res.error)
    return res.text
  }
}

export const rosterLinesForUsers = (users: UserEntry[]): string =>
  users
    .map((u) => `${u.id}: ${u.displayName}（${u.role}）`)
    .join('\n')

export const priorSummary = (
  messages: import('./workshop-types').WorkshopMessage[],
): string => priorSummaryFromMessages(messages)

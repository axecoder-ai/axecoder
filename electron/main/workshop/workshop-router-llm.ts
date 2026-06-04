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
    if (!model) throw new Error('Model not found')
    const apiKey = await getSecret(modelId)
    const apiModelId = await resolveApiModelIdForTask(model, 'main', prompt)
    const res = await chatWithProvider(
      model,
      apiKey,
      [
        {
          role: 'system',
          content:
            'You are the Collab Workshop router. Output JSON only per instructions—no markdown or extra prose.',
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

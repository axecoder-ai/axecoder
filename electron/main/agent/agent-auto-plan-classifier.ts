import type { AgentLoopMessage } from './agent-types'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import { fastApiModelId } from '../ai/api-model-resolve'
import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'

const CLASSIFIER_PROMPT = `You classify whether a coding-agent user request should first enter read-only planning mode.
Return ONLY JSON: {"needs_plan":true|false,"reason":"short reason"}.
Use true for multi-step implementation, refactors, migrations, unclear cross-file work, PRD/spec/issue work, or tasks needing investigation before edits.
Use false for explanations, simple questions, single obvious edits, direct commands, or requests that should be answered without changing files.`

const CLASSIFIER_TIMEOUT_MS = 3000

export const extractClassifierJson = (raw: string): string => {
  const s = raw.trim()
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start >= 0 && end >= start) return s.slice(start, end + 1)
  return s
}

export const parseClassifierResponse = (
  raw: string,
): { needsPlan: boolean; reason: string } => {
  const parsed = JSON.parse(extractClassifierJson(raw)) as {
    needs_plan?: boolean
    reason?: string
  }
  if (typeof parsed.needs_plan !== 'boolean') {
    throw new Error('classifier response missing needs_plan')
  }
  return { needsPlan: parsed.needs_plan, reason: String(parsed.reason ?? '').trim() }
}

/** 用便宜模型判定 borderline 任务是否应进 plan mode */
export const classifyAutoPlanNeed = async (
  input: string,
  score: number,
  opts: { chatModelId: string; classifierModelId?: string },
): Promise<{ needsPlan: boolean; reason: string }> => {
  const modelId = opts.classifierModelId?.trim() || opts.chatModelId
  const model = await getModelById(modelId)
  if (!model) throw new Error(`classifier model not found: ${modelId}`)
  const apiKey = (await getSecret(model.id)) ?? ''
  const messages: AgentLoopMessage[] = [
    { role: 'system', content: CLASSIFIER_PROMPT },
    {
      role: 'user',
      content: `heuristic_score=${score}\n\nUSER_REQUEST:\n${input.trim()}`,
    },
  ]
  const res = await chatWithToolsForModel(
    model,
    apiKey,
    messages,
    undefined,
    [],
    AbortSignal.timeout(CLASSIFIER_TIMEOUT_MS),
    fastApiModelId(model),
    'other',
  )
  if (!res.ok) throw new Error(res.error)
  return parseClassifierResponse(res.text)
}

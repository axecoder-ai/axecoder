import type { AgentLoopMessage, AgentToolName } from './agent-types'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import { fastApiModelId } from '../ai/api-model-resolve'
import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { extractClassifierJson } from './agent-auto-plan-classifier'

const CLASSIFIER_PROMPT = `You are Auto-review for a coding agent (Smart Mode).
Classify whether the tool call should be blocked pending explicit user approval.
Return ONLY JSON: {"action":"allow"|"block","reason":"short reason in English or Chinese"}.
Block: destructive shell (rm -rf, force push, chmod 777), piping curl to shell, credential exfiltration, irreversible deletes, dangerous MCP, sensitive URL fetch.
Allow: benign read-only checks, normal builds/tests, safe dev workflows.`

const CLASSIFIER_TIMEOUT_MS = 3000

export type SmartReviewDecision = { action: 'allow' | 'block'; reason: string }

export const parseSmartReviewResponse = (raw: string): SmartReviewDecision => {
  const parsed = JSON.parse(extractClassifierJson(raw)) as {
    action?: string
    reason?: string
  }
  const action = parsed.action === 'block' ? 'block' : 'allow'
  return { action, reason: String(parsed.reason ?? '').trim() }
}

export const classifySmartReview = async (
  toolName: AgentToolName,
  args: Record<string, unknown>,
  opts: { chatModelId: string; classifierModelId?: string },
): Promise<SmartReviewDecision> => {
  const modelId = opts.classifierModelId?.trim() || opts.chatModelId
  const model = await getModelById(modelId)
  if (!model) throw new Error(`smart review classifier model not found: ${modelId}`)
  const apiKey = (await getSecret(model.id)) ?? ''
  const messages: AgentLoopMessage[] = [
    { role: 'system', content: CLASSIFIER_PROMPT },
    {
      role: 'user',
      content: `TOOL: ${toolName}\nARGS:\n${JSON.stringify(args, null, 2)}`,
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
  return parseSmartReviewResponse(res.text)
}

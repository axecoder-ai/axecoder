import type { AiTokenUsage } from '../models-types'

export const parseOpenAiUsage = (obj: Record<string, unknown>): AiTokenUsage | undefined => {
  const usage = obj.usage
  if (!usage || typeof usage !== 'object') return undefined
  const u = usage as Record<string, unknown>
  const prompt = typeof u.prompt_tokens === 'number' ? u.prompt_tokens : 0
  const completion = typeof u.completion_tokens === 'number' ? u.completion_tokens : 0
  if (!prompt && !completion) return undefined
  return { promptTokens: prompt, completionTokens: completion, estimated: false }
}

export const estimateTokenUsage = (inputChars: number, outputChars: number): AiTokenUsage => ({
  promptTokens: Math.max(1, Math.round(inputChars / 4)),
  completionTokens: Math.max(1, Math.round(outputChars / 4)),
  estimated: true,
})

import { getConfig } from '../config-store'
import type { ModelEntry } from '../models-types'
import { classifyPromptTier, type PromptTier } from './prompt-tier-heuristic'
import type { ModelTaskKind } from './model-resolve'

export type ApiModelTier = 'fast' | 'deep' | 'auto'

export const deepApiModelId = (entry: ModelEntry): string => entry.modelId.trim()

export const fastApiModelId = (entry: ModelEntry): string => {
  const fast = entry.fastApiModelId?.trim() ?? ''
  return fast || deepApiModelId(entry)
}

export const resolveApiModelId = (
  entry: ModelEntry,
  tier: ApiModelTier,
  userText = '',
  routingEnabled = true,
): string => {
  if (!routingEnabled) return deepApiModelId(entry)
  let pick: PromptTier
  if (tier === 'fast') pick = 'fast'
  else if (tier === 'deep') pick = 'deep'
  else pick = classifyPromptTier(userText)
  return pick === 'fast' ? fastApiModelId(entry) : deepApiModelId(entry)
}

export const apiModelTierForTaskKind = (kind: ModelTaskKind): ApiModelTier =>
  kind === 'subagent' ? 'fast' : 'auto'

export const resolveApiModelIdForTask = async (
  entry: ModelEntry,
  kind: ModelTaskKind,
  userText = '',
): Promise<string> => {
  const config = await getConfig()
  const routingEnabled = config.agentModelTierRoutingEnabled !== false
  return resolveApiModelId(entry, apiModelTierForTaskKind(kind), userText, routingEnabled)
}

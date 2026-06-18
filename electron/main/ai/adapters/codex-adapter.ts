import { AGENT_TOOLS } from '../../agent/agent-tool-defs'
import {
  DEFAULT_REASONING_EFFORT,
  reasoningEffortForApi,
} from '../../../../shared/reasoning-effort'
import { PROVIDER_CAPABILITIES } from '../../../../shared/ai/provider-capabilities'
import type { AiProviderAdapter } from '../provider-types'
import { chatCodex, chatCodexWithTools } from '../providers/codex'

export const codexAdapter: AiProviderAdapter = {
  id: 'codex',
  capabilities: PROVIDER_CAPABILITIES.codex,
  chat: async ({ model, apiKey, messages, onDelta, apiModelId, reasoningEffort }) =>
    chatCodex(
      model.baseUrl,
      (apiModelId?.trim() || model.modelId).trim(),
      apiKey,
      messages,
      onDelta,
      reasoningEffortForApi(reasoningEffort ?? DEFAULT_REASONING_EFFORT),
    ),
  chatWithTools: async ({
    model,
    apiKey,
    messages,
    onDelta,
    tools = AGENT_TOOLS,
    abortSignal,
    apiModelId,
    reasoningEffort,
  }) =>
    chatCodexWithTools(
      model.baseUrl,
      (apiModelId?.trim() || model.modelId).trim(),
      apiKey,
      messages,
      onDelta,
      tools,
      abortSignal,
      reasoningEffortForApi(reasoningEffort ?? DEFAULT_REASONING_EFFORT),
    ),
}

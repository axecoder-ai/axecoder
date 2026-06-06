import type { AiChatMessage, AiChatResult, ModelEntry } from '../models-types'
import type { AgentLoopMessage } from '../agent/agent-types'
import {
  lastAgentUserMessageHasImages,
  lastUserMessageHasImages,
  stripImagesFromAgentMessages,
  stripImagesFromMessages,
} from './ai-message-images'
import { isVisionUnsupportedApiError, modelSupportsVision } from '../../../shared/ai/vision'
import { t } from '../i18n'

export const visionUnsupportedError = (model: ModelEntry) =>
  t('errors.visionUnsupported', { model: model.name.trim() || model.modelId })

export const prepareMessagesForVisionModel = (
  model: ModelEntry,
  messages: AiChatMessage[],
): AiChatResult | { ok: true; messages: AiChatMessage[] } => {
  if (modelSupportsVision(model)) return { ok: true, messages }
  if (lastUserMessageHasImages(messages)) {
    return { ok: false, error: visionUnsupportedError(model) }
  }
  return { ok: true, messages: stripImagesFromMessages(messages) }
}

export const prepareAgentMessagesForVisionModel = (
  model: ModelEntry,
  messages: AgentLoopMessage[],
): { ok: false; error: string } | { ok: true; messages: AgentLoopMessage[] } => {
  if (modelSupportsVision(model)) return { ok: true, messages }
  if (lastAgentUserMessageHasImages(messages)) {
    return { ok: false, error: visionUnsupportedError(model) }
  }
  return { ok: true, messages: stripImagesFromAgentMessages(messages) }
}

/** @deprecated use prepareMessagesForVisionModel */
export const checkVisionBeforeChat = (
  model: ModelEntry,
  messages: AiChatMessage[],
): AiChatResult | null => {
  const prepared = prepareMessagesForVisionModel(model, messages)
  if (!prepared.ok) return prepared
  return null
}

export const normalizeAiChatResult = (model: ModelEntry, result: AiChatResult): AiChatResult => {
  if (result.ok) return result
  if (isVisionUnsupportedApiError(result.error)) {
    return { ok: false, error: visionUnsupportedError(model) }
  }
  return result
}

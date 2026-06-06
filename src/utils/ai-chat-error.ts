import { isVisionUnsupportedApiError } from '@shared/ai/vision'
import type { ModelEntry } from '../types/axecoder'
import { appT } from '../i18n/translate'

export const visionUnsupportedMessage = (model?: ModelEntry) =>
  appT('errors.visionUnsupported', { model: model?.name?.trim() || model?.modelId || '' })

/** 主进程已翻译的错误原样展示；原始 API 错误则加前缀并识别多模态不支持 */
export const formatAiChatRequestError = (raw: string, model?: ModelEntry): string => {
  if (isVisionUnsupportedApiError(raw)) return visionUnsupportedMessage(model)
  if (raw.startsWith('request failed (') || raw.startsWith('Request timed out')) {
    return appT('common.requestFailed', { error: raw })
  }
  return raw
}

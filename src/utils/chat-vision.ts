import { modelSupportsVision } from '@shared/ai/vision'
import type { ModelEntry } from '../types/axecoder'

/** 仅拦截本次发送附带的图片，不因历史消息含图而阻断后续纯文本 */
export const visionBlockedForPendingImages = (model: ModelEntry, pendingImageCount: number) =>
  !modelSupportsVision(model) && pendingImageCount > 0

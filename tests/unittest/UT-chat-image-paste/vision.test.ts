import { describe, expect, it } from 'vitest'
import { isVisionUnsupportedApiError, modelSupportsVision } from '../../../shared/ai/vision'
import {
  lastUserMessageHasImages,
  stripImagesFromMessages,
} from '../../../electron/main/ai/ai-message-images'
import { prepareMessagesForVisionModel } from '../../../electron/main/ai/ai-vision-guard'
import type { ModelEntry } from '../../../electron/main/models-types'

const textModel: ModelEntry = {
  id: 'm1',
  name: 'deepseek-v4',
  provider: 'openai',
  modelId: 'deepseek-v4',
  baseUrl: 'https://api.example.com/v1',
  enabled: true,
}

describe('vision helpers', () => {
  it('modelSupportsVision only when explicitly true', () => {
    expect(modelSupportsVision({})).toBe(false)
    expect(modelSupportsVision({ supportsVision: false })).toBe(false)
    expect(modelSupportsVision({ supportsVision: true })).toBe(true)
  })

  it('detects OpenAI image_url deserialize errors', () => {
    const err =
      'request failed (400): {"error":{"message":"Failed to deserialize the JSON body into the target type: messages[1]: unknown variant image_url, expected text at line 1 column 57598"}}'
    expect(isVisionUnsupportedApiError(err)).toBe(true)
  })

  it('ignores unrelated API errors', () => {
    expect(isVisionUnsupportedApiError('request failed (401): unauthorized')).toBe(false)
  })

  it('strips historical images but allows follow-up text', () => {
    const messages = [
      {
        role: 'user' as const,
        content: '(image)',
        images: [{ mimeType: 'image/png', data: 'abc' }],
      },
      { role: 'assistant' as const, content: 'error' },
      { role: 'user' as const, content: 'hi' },
    ]
    expect(lastUserMessageHasImages(messages)).toBe(false)
    const prepared = prepareMessagesForVisionModel(textModel, messages)
    expect(prepared.ok).toBe(true)
    if (!prepared.ok) return
    expect(prepared.messages[0]?.images).toBeUndefined()
    expect(stripImagesFromMessages(messages)[0]?.content).toContain('image')
  })

  it('blocks only when the latest user turn still carries images', () => {
    const messages = [
      {
        role: 'user' as const,
        content: '(image)',
        images: [{ mimeType: 'image/png', data: 'abc' }],
      },
    ]
    expect(lastUserMessageHasImages(messages)).toBe(true)
    const prepared = prepareMessagesForVisionModel(textModel, messages)
    expect(prepared.ok).toBe(false)
  })
})

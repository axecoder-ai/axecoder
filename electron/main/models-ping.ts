import { chatWithProvider } from './ai/chat-with-provider'
import { getModelById } from './models-store'
import { getSecret } from './secrets-store'

export type ModelPingResult =
  | { ok: true; preview: string }
  | { ok: false; error: string }

export const pingModel = async (id: string): Promise<ModelPingResult> => {
  const model = await getModelById(id)
  if (!model) return { ok: false, error: 'Model not found' }
  if (!model.enabled) return { ok: false, error: 'Enable the model first' }
  const apiKey = await getSecret(id)
  const res = await chatWithProvider(model, apiKey, [{ role: 'user', content: 'Hi' }])
  if (!res.ok) return { ok: false, error: res.error }
  const text = (res.text ?? res.content ?? '').trim()
  const preview = text ? text.slice(0, 80) : 'Connected'
  return { ok: true, preview }
}

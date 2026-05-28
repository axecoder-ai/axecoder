import { ipcMain } from 'electron'
import type { AiChatMessage } from './models-types'
import { getModelById } from './models-store'
import { getSecret } from './secrets-store'
import { chatWithProvider } from './ai/chat-with-provider'

export const registerAiIpc = () => {
  ipcMain.handle('ai:chat', async (_, modelId: string, messages: AiChatMessage[]) => {
    if (!modelId?.trim()) return { ok: false as const, error: '未选择模型' }
    const model = await getModelById(modelId)
    if (!model) return { ok: false as const, error: '模型不存在' }
    const apiKey = await getSecret(modelId)
    return chatWithProvider(model, apiKey, messages)
  })
}

import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import type { AiChatMessage } from './models-types'
import { getModelById } from './models-store'
import { getSecret } from './secrets-store'
import { chatWithProvider } from './ai/chat-with-provider'
import { resolvePathInProject } from './agent/agent-path'
import { buildUserMessageWithFiles } from '../../src/utils/chat-file-context'

export const registerAiIpc = () => {
  ipcMain.handle(
    'chat:expandUserWithFiles',
    async (
      _,
      projectRoot: string,
      text: string,
      filePaths: string[],
    ): Promise<string> => {
      const root = typeof projectRoot === 'string' ? projectRoot.trim() : ''
      const paths = Array.isArray(filePaths) ? filePaths.filter((p) => typeof p === 'string' && p) : []
      if (!root || !paths.length) return typeof text === 'string' ? text : ''
      return buildUserMessageWithFiles(
        text,
        paths,
        root,
        async (p) => {
          const resolved = resolvePathInProject(root, p)
          if (!resolved) throw new Error('outside project')
          return { content: await fs.readFile(resolved, 'utf-8') }
        },
      )
    },
  )

  ipcMain.handle('ai:chat', async (_, modelId: string, messages: AiChatMessage[]) => {
    if (!modelId?.trim()) return { ok: false as const, error: '未选择模型' }
    const model = await getModelById(modelId)
    if (!model) return { ok: false as const, error: '模型不存在' }
    const apiKey = await getSecret(modelId)
    return chatWithProvider(model, apiKey, messages)
  })
}

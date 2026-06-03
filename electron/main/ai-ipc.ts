import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import fs from 'node:fs/promises'
import type { AiChatMessage } from './models-types'
import { getModelById } from './models-store'
import { getSecret } from './secrets-store'
import { chatWithProvider } from './ai/chat-with-provider'
import { resolveApiModelIdForTask } from './ai/api-model-resolve'
import { resolvePathInProject } from './agent/agent-path'
import { buildUserMessageWithFiles } from '../../src/utils/chat-file-context'
import {
  saveChatPastedImage,
  resolveChatImageRefs,
  chatImageRefPreviewDataUrl,
  type ChatImageRef,
} from './chat-attachments'
import { emitAiStream } from './ai-stream-emit'
import type { OpenAiStreamDelta } from './ai/providers/openai'

let aiStreamSeq = 0

const openAiStreamHandler = (event: IpcMainInvokeEvent, streamId: string) => {
  return (delta: OpenAiStreamDelta) => {
    const text = (delta.content ?? '') + (delta.reasoning ?? '')
    if (text) emitAiStream(event.sender, { streamId, delta: text })
  }
}

export const registerAiIpc = () => {
  ipcMain.handle(
    'chat:savePastedImage',
    async (_, sessionId: string, base64: string, mimeType: string) => {
      try {
        const ref = await saveChatPastedImage(sessionId, base64, mimeType)
        const dataUrl = await chatImageRefPreviewDataUrl(ref)
        return { ok: true as const, ref, dataUrl }
      } catch (e) {
        return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
      }
    },
  )

  ipcMain.handle('chat:imagePreview', async (_, ref: ChatImageRef) => {
    try {
      const dataUrl = await chatImageRefPreviewDataUrl(ref)
      return { ok: true as const, dataUrl }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('chat:resolveImageRefs', async (_, refs: ChatImageRef[]) => {
    try {
      const list = Array.isArray(refs) ? refs : []
      const images = await resolveChatImageRefs(list)
      return { ok: true as const, images }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

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

  ipcMain.handle(
    'ai:chat',
    async (event, modelId: string, messages: AiChatMessage[], clientStreamId?: string) => {
      if (!modelId?.trim()) return { ok: false as const, error: '未选择模型' }
      const model = await getModelById(modelId)
      if (!model) return { ok: false as const, error: '模型不存在' }
      const apiKey = await getSecret(modelId)
      const streamId =
        typeof clientStreamId === 'string' && clientStreamId.trim()
          ? clientStreamId.trim()
          : `ai-${Date.now()}-${++aiStreamSeq}`
      const onDelta =
        model.provider === 'openai' ? openAiStreamHandler(event, streamId) : undefined
      const lastUser = [...messages].reverse().find((m) => m.role === 'user')
      const userText = typeof lastUser?.content === 'string' ? lastUser.content : ''
      const apiModelId = await resolveApiModelIdForTask(model, 'main', userText)
      return chatWithProvider(model, apiKey, messages, onDelta, apiModelId)
    },
  )
}

import fs from 'node:fs/promises'
import path from 'node:path'
import { ensureAxecoderDir, axecoderPath } from './axecoder-dir'
import type { AiChatImagePart } from './models-types'

const DIR = 'chat-attachments'

const safeSegment = (s: string) => s.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120)

const extForMime = (mime: string) => {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/gif') return '.gif'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/jpeg' || mime === 'image/jpg') return '.jpg'
  return '.png'
}

export type ChatImageRef = {
  id: string
  mimeType: string
  /** 相对 ~/.axecoder */
  storagePath: string
}

export const saveChatPastedImage = async (
  sessionId: string,
  base64: string,
  mimeType: string,
): Promise<ChatImageRef> => {
  const sid = safeSegment(sessionId.trim() || 'default')
  const mime = mimeType.trim() || 'image/png'
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const rel = path.join(DIR, sid, `${id}${extForMime(mime)}`)
  await ensureAxecoderDir()
  await fs.mkdir(path.dirname(axecoderPath(rel)), { recursive: true })
  const buf = Buffer.from(base64.replace(/\s/g, ''), 'base64')
  if (!buf.length) throw new Error('Image data is empty')
  if (buf.length > 8 * 1024 * 1024) throw new Error('Image must be under 8MB')
  await fs.writeFile(axecoderPath(rel), buf)
  return { id, mimeType: mime, storagePath: rel }
}

export const resolveChatImageRefs = async (
  refs: ChatImageRef[],
): Promise<AiChatImagePart[]> => {
  const out: AiChatImagePart[] = []
  for (const ref of refs) {
    if (!ref?.storagePath) continue
    const abs = axecoderPath(ref.storagePath)
    const buf = await fs.readFile(abs)
    out.push({
      mimeType: ref.mimeType || 'image/png',
      data: buf.toString('base64'),
    })
  }
  return out
}

export const chatImageRefPreviewDataUrl = async (ref: ChatImageRef): Promise<string> => {
  const buf = await fs.readFile(axecoderPath(ref.storagePath))
  const mime = ref.mimeType || 'image/png'
  return `data:${mime};base64,${buf.toString('base64')}`
}

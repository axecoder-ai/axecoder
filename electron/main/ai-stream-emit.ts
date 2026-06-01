import type { WebContents } from 'electron'

export type AiStreamPayload = {
  streamId: string
  delta: string
}

export const emitAiStream = (wc: WebContents, payload: AiStreamPayload) => {
  if (wc.isDestroyed()) return
  wc.send('ai:stream', payload)
}

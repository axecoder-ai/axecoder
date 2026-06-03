import { ref, type Ref } from 'vue'
import type { ChatImageRef } from '../types/axecoder'
import { firstImageFileFromClipboard, fileToBase64 } from '../utils/chat-image-paste'

export type AttachedImageView = { ref: ChatImageRef; previewUrl: string }

export const useChatAttachedImages = (sessionId: Ref<string>) => {
  const attachedImages = ref<AttachedImageView[]>([])

  const onPasteImage = async (e: ClipboardEvent) => {
    const file = firstImageFileFromClipboard(e)
    if (!file) return
    e.preventDefault()
    try {
      const { base64, mimeType } = await fileToBase64(file)
      const sid = sessionId.value.trim() || 'default'
      const res = await window.axecoder.saveChatPastedImage(sid, base64, mimeType)
      if (!res.ok) {
        window.alert(res.error)
        return
      }
      attachedImages.value.push({ ref: res.ref, previewUrl: res.dataUrl })
    } catch (err) {
      window.alert(err instanceof Error ? err.message : String(err))
    }
  }

  const removeAttachedImage = (id: string) => {
    attachedImages.value = attachedImages.value.filter((x) => x.ref.id !== id)
  }

  const clearAttachedImages = () => {
    attachedImages.value = []
  }

  const resolveImageRefsForApi = async (refs: ChatImageRef[]) => {
    if (!refs.length) return undefined
    const plain = JSON.parse(JSON.stringify(refs)) as ChatImageRef[]
    const res = await window.axecoder.resolveChatImageRefs(plain)
    if (!res.ok) throw new Error(res.error)
    return res.images
  }

  const resolveAttachedImagesForApi = async () =>
    resolveImageRefsForApi(attachedImages.value.map((x) => x.ref))

  const imageRefsForPersist = (): ChatImageRef[] => attachedImages.value.map((x) => x.ref)

  return {
    attachedImages,
    onPasteImage,
    removeAttachedImage,
    clearAttachedImages,
    resolveAttachedImagesForApi,
    resolveImageRefsForApi,
    imageRefsForPersist,
  }
}

/** 从剪贴板事件中取出第一张图片 File */
export const firstImageFileFromClipboard = (e: ClipboardEvent): File | null => {
  const items = e.clipboardData?.items
  if (!items) return null
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const f = item.getAsFile()
      if (f) return f
    }
  }
  return null
}

export const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('读取图片失败'))
        return
      }
      const comma = result.indexOf(',')
      const base64 = comma >= 0 ? result.slice(comma + 1) : result
      resolve({ base64, mimeType: file.type || 'image/png' })
    }
    reader.onerror = () => reject(reader.error ?? new Error('读取图片失败'))
    reader.readAsDataURL(file)
  })

/** 模型配置中显式开启后才视为支持用户图片输入 */
export const modelSupportsVision = (model: { supportsVision?: boolean }) =>
  model.supportsVision === true

/** API 返回体表明当前端点/模型不接受多模态 user content */
export const isVisionUnsupportedApiError = (err: string): boolean => {
  const lower = err.toLowerCase()
  if (lower.includes('image_url')) return true
  if (lower.includes('unknown variant') && lower.includes('image')) return true
  if (lower.includes('multimodal')) return true
  if (lower.includes('"type":"image"') || lower.includes("'type': 'image'")) return true
  if (
    lower.includes('vision') &&
    (lower.includes('not support') ||
      lower.includes('unsupported') ||
      lower.includes('does not support'))
  ) {
    return true
  }
  return false
}

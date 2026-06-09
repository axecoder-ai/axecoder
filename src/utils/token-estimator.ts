/**
 * 估算文本的 token 数量
 * 简单估算：英文 1 token ≈ 4 字符，中文 1 token ≈ 2 字符
 */
export function estimateTokens(text: string): number {
  if (!text) return 0

  // 统计中文字符（Unicode 范围：4E00-9FA5）
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  const otherChars = text.length - chineseChars

  // 中文：2 字符 ≈ 1 token，英文：4 字符 ≈ 1 token
  return Math.ceil(chineseChars / 2 + otherChars / 4)
}

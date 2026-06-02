/** 根据用户文本判断应用 fast 还是 deep API 模型 */
export type PromptTier = 'fast' | 'deep'

const DEEP_KEYWORDS =
  /重构|架构|审查|调试|全量|实现方案|设计文档|refactor|architect|implement|review|debug|migrate|security audit/i

const FILE_PATH = /(?:^|\s)(?:[\w.-]+\/)+[\w.-]+|\b[\w.-]+\.(?:ts|tsx|js|vue|py|go|rs|md)\b/gi

export const classifyPromptTier = (userText: string): PromptTier => {
  const t = userText.trim()
  if (!t) return 'fast'
  if (t.length > 400) return 'deep'
  if (/```/.test(t)) return 'deep'
  const paths = t.match(FILE_PATH)
  if (paths && paths.length >= 2) return 'deep'
  if (DEEP_KEYWORDS.test(t)) return 'deep'
  return 'fast'
}

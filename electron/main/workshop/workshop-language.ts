import { agentLanguageForLocale } from '../../../shared/i18n'
import { getMainLocale } from '../i18n'
import { loadAlwaysApplyRulesPrompt } from '../rules/rules-store'

const CHINESE_RULE = /Always respond in 中文|用中文回复|respond in 中文|respond in Chinese/i
const ENGLISH_RULE = /Always respond in English|用英文回复|respond in English/i

export const workshopReplyLanguageFromLocale = (): string =>
  agentLanguageForLocale(getMainLocale())

/** locale + alwaysApply 规则 → Workshop 群聊回复语言 */
export const resolveWorkshopReplyLanguage = async (projectRoot: string): Promise<string> => {
  const root = projectRoot.trim()
  if (root) {
    try {
      const rules = await loadAlwaysApplyRulesPrompt(root)
      if (rules) {
        if (CHINESE_RULE.test(rules)) return '中文'
        if (ENGLISH_RULE.test(rules)) return 'English'
      }
    } catch {
      /* skip */
    }
  }
  return workshopReplyLanguageFromLocale()
}

export const workshopLanguageInstruction = (lang: string): string =>
  `Always respond in ${lang}. Use ${lang} for group messages, summaries, and explanations to the user. Technical terms and code identifiers may stay in their original form.`

export const buildWorkshopRouterSystemPrompt = async (projectRoot: string): Promise<string> => {
  const lang = await resolveWorkshopReplyLanguage(projectRoot)
  let rules: string | null = null
  try {
    rules = await loadAlwaysApplyRulesPrompt(projectRoot)
  } catch {
    /* skip */
  }
  return [
    'You are the Collab Workshop router. Output JSON only per instructions—no markdown or extra prose.',
    workshopLanguageInstruction(lang),
    rules,
  ]
    .filter(Boolean)
    .join('\n\n')
}

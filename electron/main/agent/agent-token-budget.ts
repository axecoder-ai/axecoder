import type { AppConfig } from '../models-types'
import type { AgentLoopMessage } from './agent-types'
import { estimateContextChars } from './agent-frc'

/** token_budget / brief 动态提示段 */
export const getTokenBudgetSection = (
  cfg: AppConfig,
  messages: AgentLoopMessage[],
): string | null => {
  const budget = cfg.agentTokenBudget
  if (budget === undefined || budget === null || budget <= 0) return null

  const used = estimateContextChars(messages)
  const ratio = used / budget
  const pct = Math.min(100, Math.round(ratio * 100))

  let line = `Context budget: ~${used} chars used of ~${budget} token_budget hint (${pct}%).`
  if (ratio >= 0.85) {
    line += ' Approaching limit — prefer concise replies; older tool results may be cleared automatically.'
  }
  if (cfg.agentFeatureBrief) {
    line += ' Brief mode is enabled: keep responses minimal unless the user asks for detail.'
  }
  return line
}

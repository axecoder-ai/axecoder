import type { AgentPendingAskUser } from '../types/axecoder'

/** 将 AskUserQuestion 选项答案格式化为 Workshop 用户消息 */
export const formatWorkshopAskAnswers = (
  pending: AgentPendingAskUser,
  answers: Record<string, string | string[]>,
): string => {
  const lines: string[] = []
  for (const q of pending.questions) {
    const ans = answers[q.id]
    if (Array.isArray(ans)) {
      const labels = ans.map((id) => q.options.find((o) => o.id === id)?.label ?? id)
      lines.push(`${q.prompt}：${labels.join('、')}`)
    } else {
      const label = q.options.find((o) => o.id === ans)?.label ?? String(ans)
      lines.push(`${q.prompt}：${label}`)
    }
  }
  return lines.join('\n')
}

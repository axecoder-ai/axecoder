import type { UserEntry } from '../users-types'
import { extractRelatedFiles } from './workshop-subagent-speaker'
import { parseManagerStepPlan, parseManagerVerifyDecision } from './workshop-plan-parse'
import type { RoleSpeakMode } from './workshop-types'

const cjkCount = (s: string) => (s.match(/[\u4e00-\u9fff]/g) ?? []).length

/** 成员群聊正文：仅「已完成 + 涉及文件」；完整 report 存入 reasoningContent */
export const formatMemberChatSummary = (
  report: string,
  relatedFiles?: string[],
): { summary: string; reasoningContent?: string } => {
  const files = relatedFiles?.length ? relatedFiles : extractRelatedFiles(report)
  const summary =
    files.length > 0
      ? `已完成本段工作。\n\n涉及文件：\n${files.map((f) => `- ${f}`).join('\n')}`
      : '已完成本段工作。'
  const raw = report.trim()
  return {
    summary,
    reasoningContent: raw.length > summary.length + 20 ? raw.slice(0, 8000) : undefined,
  }
}

/** 群聊正文：简短中文结论；完整 report 留给解析 */
export const formatWorkshopRoleDisplay = (
  report: string,
  mode: RoleSpeakMode | undefined,
  users: UserEntry[],
): { summary: string; planSource: string; reasoningContent?: string } => {
  const raw = report.trim()
  const planSource = raw

  if (mode === 'plan') {
    const parsed = parseManagerStepPlan(raw, users)
    if (parsed.ok) {
      const lines = parsed.plan.steps.map((s, i) => {
        const u = users.find((x) => x.id === s.assigneeUserId)
        const who = u ? u.displayName : s.assigneeUserId
        return `${i + 1}. ${s.title}（${who}）`
      })
      return {
        summary: `协作计划共 ${parsed.plan.steps.length} 步：\n${lines.join('\n')}`,
        planSource,
      }
    }
    const tail = pickChineseTail(raw)
    return {
      summary: tail || '未能从回复中解析步骤 JSON，请重试。',
      planSource,
    }
  }

  if (mode === 'verify') {
    const d = parseManagerVerifyDecision(raw)
    const verb =
      d.action === 'approve' ? '通过' : d.action === 'redo' ? '要求重做' : '终止协作'
    const comment = d.comment
      .replace(/VERIFY\s*:\s*(approve|redo|abort)/gi, '')
      .trim()
      .slice(0, 300)
    return {
      summary: comment ? `验收：${verb}。${comment}` : `验收：${verb}。`,
      planSource,
    }
  }

  const conclusion = pickChineseTail(raw) || raw.slice(0, 500)
  const reasoning =
    raw.length > conclusion.length + 80 ? raw.slice(0, raw.length - conclusion.length).trim() : undefined
  return {
    summary: conclusion,
    planSource,
    reasoningContent: reasoning?.slice(0, 4000) || undefined,
  }
}

const pickChineseTail = (text: string): string => {
  const withoutJson = text.replace(/```[\s\S]*?```/g, '').trim()
  const paras = withoutJson.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)
  const chinese = paras.filter((p) => cjkCount(p) >= 8 && cjkCount(p) >= p.length * 0.15)
  if (chinese.length) return chinese[chinese.length - 1].slice(0, 600)
  const lines = withoutJson.split('\n').filter((l) => cjkCount(l) >= 4)
  if (lines.length) return lines[lines.length - 1].slice(0, 600)
  return ''
}

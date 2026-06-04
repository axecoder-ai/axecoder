import type { UserEntry } from '../users-types'
import { extractRelatedFiles } from './workshop-subagent-speaker'
import { parseManagerStepPlan, parseManagerVerifyDecision } from './workshop-plan-parse'
import type { RoleSpeakMode } from './workshop-types'

const cjkCount = (s: string) => (s.match(/[\u4e00-\u9fff]/g) ?? []).length

/** 群聊可见正文：保留实质结论（供后续角色 priorSummary 使用） */
export const summarizeReportForChat = (report: string, maxLen = 1000): string => {
  const raw = report.trim()
  if (!raw) return '(no conclusion)'
  const withoutFences = raw.replace(/```[\s\S]*?```/g, '').trim()
  const body = withoutFences || raw
  if (body.length <= maxLen) return body
  return `${body.slice(0, maxLen)}…`
}

/** Member 群聊：结论 + 文件列表；完整 report 进 reasoningContent */
export const formatMemberChatSummary = (
  report: string,
  relatedFiles?: string[],
): { summary: string; reasoningContent?: string } => {
  const files = relatedFiles?.length ? relatedFiles : extractRelatedFiles(report)
  const raw = report.trim()
  const conclusion = summarizeReportForChat(raw, 1000)
  const fileBlock =
    files.length > 0 ? `\n\nFiles touched:\n${files.map((f) => `- ${f}`).join('\n')}` : ''
  const summary = `${conclusion}${fileBlock}`.trim()
  return {
    summary,
    reasoningContent: raw.length > summary.length + 20 ? raw.slice(0, 8000) : undefined,
  }
}

/** Tech Lead 读码摘要（hidden，供路由） */
export const formatManagerCodeBrief = (report: string): { summary: string; reasoningContent?: string } => {
  const raw = report.trim()
  const summary = summarizeReportForChat(raw, 800)
  return {
    summary: summary ? `[Codebase notes] ${summary}` : '',
    reasoningContent: raw.length > summary.length + 20 ? raw.slice(0, 4000) : undefined,
  }
}

/** Group chat body: brief English summary; full report for parsing */
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
        summary: `Collaboration plan: ${parsed.plan.steps.length} steps:\n${lines.join('\n')}`,
        planSource,
      }
    }
    const tail = pickChineseTail(raw)
    return {
      summary: tail || 'Could not parse step JSON from reply; retry.',
      planSource,
    }
  }

  if (mode === 'verify') {
    const d = parseManagerVerifyDecision(raw)
    const verb =
      d.action === 'approve' ? 'approved' : d.action === 'redo' ? 'request redo' : 'abort collaboration'
    const comment = d.comment
      .replace(/VERIFY\s*:\s*(approve|redo|abort)/gi, '')
      .trim()
      .slice(0, 300)
    return {
      summary: comment ? `Review: ${verb}。${comment}` : `Review: ${verb}。`,
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

export type SopPrd = {
  title: string
  userStories: string[]
  requirementPool?: string[]
  competitiveAnalysis?: string
}

export const parsePrdJson = (raw: string): { ok: true; prd: SopPrd } | { ok: false; error: string } => {
  try {
    const data = JSON.parse(raw) as SopPrd
    if (!data || typeof data.title !== 'string') {
      return { ok: false, error: 'PRD missing title' }
    }
    if (!Array.isArray(data.userStories) || data.userStories.length === 0) {
      return { ok: false, error: 'PRD userStories must be non-empty' }
    }
    return { ok: true, prd: data }
  } catch {
    return { ok: false, error: 'PRD invalid JSON' }
  }
}

export const prdToMarkdown = (prd: SopPrd): string => {
  const lines = [`# ${prd.title}`, '', '## User Stories', ...prd.userStories.map((s) => `- ${s}`)]
  if (prd.requirementPool?.length) {
    lines.push('', '## Requirement Pool', ...prd.requirementPool.map((r) => `- ${r}`))
  }
  if (prd.competitiveAnalysis?.trim()) {
    lines.push('', '## Competitive Analysis', prd.competitiveAnalysis.trim())
  }
  return lines.join('\n')
}

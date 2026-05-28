import { readProjectFile } from '../agent-fs'
import {
  countTextUnits,
  extractChapterSection,
  extractKeyPoints,
} from './expand-chapter'

export type SummarizeChapterInput = {
  projectRoot: string
  filePath: string
  chapterHeading: string
  maxPoints?: number
  focus?: string
}

export const runSummarizeChapter = async (
  input: SummarizeChapterInput,
): Promise<{ ok: true; content: string; summary: string } | { ok: false; error: string }> => {
  const read = await readProjectFile(input.projectRoot, input.filePath)
  if (!read.ok) return { ok: false, error: read.error }

  const section = extractChapterSection(read.content, input.chapterHeading)
  if (!section.ok) return { ok: false, error: section.error }

  let keyPoints = extractKeyPoints(section.body)
  if (!keyPoints.length) return { ok: false, error: 'Chapter body is empty' }

  const max = input.maxPoints && input.maxPoints > 0 ? Math.floor(input.maxPoints) : 0
  if (max > 0 && keyPoints.length > max) keyPoints = keyPoints.slice(0, max)

  const charCount = countTextUnits(section.body)
  const lines: string[] = []

  lines.push('# SummarizeChapter 章节内容分析总结')
  lines.push('')
  lines.push(`- 文件: ${input.filePath}`)
  lines.push(`- 章节标题: ${'#'.repeat(section.headingLevel)} ${section.heading}`)
  lines.push(`- 行范围: ${section.startLine}-${section.endLine}`)
  lines.push(`- 原文字数: ${charCount}`)
  lines.push(`- 提炼要点数: ${keyPoints.length}`)
  lines.push('')
  lines.push('## 核心要点（按 1、2、3… 理解章节，勿遗漏顺序逻辑）')
  keyPoints.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.replace(/\n/g, ' ').trim()}`)
  })
  lines.push('')
  lines.push('## 使用说明')
  lines.push('- 以上要点从杂乱正文中结构化抽出，便于抓重点与后续改写。')
  lines.push('- 若需扩写章节，可再调用 ExpandChapter 获取扩写工作流。')
  if ((input.focus ?? '').trim()) {
    lines.push('')
    lines.push('## 用户关注方向')
    lines.push((input.focus ?? '').trim())
  }
  lines.push('')
  lines.push('## 章节原文（对照用）')
  lines.push(section.body)

  const summary = `分析 ${input.filePath}「${section.heading}」${keyPoints.length} 要点`
  return { ok: true, content: lines.join('\n'), summary }
}

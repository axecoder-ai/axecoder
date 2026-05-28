import { readProjectFile } from '../agent-fs'

export type ExpandChapterInput = {
  projectRoot: string
  filePath: string
  chapterHeading: string
  targetWordCount?: number
  outputFormat: 'list' | 'prose' | 'auto'
  requirements: string
}

type HeadingLine = { level: number; text: string; lineIndex: number }

const normalizeHeading = (raw: string) =>
  raw
    .trim()
    .replace(/^#+\s*/, '')
    .trim()
    .toLowerCase()

const parseHeadingLine = (line: string, lineIndex: number): HeadingLine | null => {
  const m = line.match(/^(#{1,6})\s+(.+?)\s*$/)
  if (!m) return null
  return { level: m[1].length, text: m[2].trim(), lineIndex }
}

/** 从全文定位章节：匹配标题行，截取到同级或更高级下一标题前 */
export const extractChapterSection = (
  fullText: string,
  chapterHeading: string,
): { ok: true; heading: string; headingLevel: number; body: string; startLine: number; endLine: number } | { ok: false; error: string } => {
  const query = normalizeHeading(chapterHeading)
  if (!query) return { ok: false, error: 'Empty chapter_heading' }

  const lines = fullText.split('\n')
  let found: HeadingLine | null = null

  for (let i = 0; i < lines.length; i++) {
    const h = parseHeadingLine(lines[i], i)
    if (!h) continue
    const norm = normalizeHeading(h.text)
    if (norm === query || norm.includes(query) || query.includes(norm)) {
      found = h
      break
    }
  }

  if (!found) return { ok: false, error: `Chapter not found for heading: ${chapterHeading}` }

  const bodyLines: string[] = []
  let endLine = lines.length - 1

  for (let i = found.lineIndex + 1; i < lines.length; i++) {
    const h = parseHeadingLine(lines[i], i)
    if (h && h.level <= found.level) {
      endLine = i - 1
      break
    }
    bodyLines.push(lines[i])
    endLine = i
  }

  const body = bodyLines.join('\n').trim()
  return {
    ok: true,
    heading: found.text,
    headingLevel: found.level,
    body,
    startLine: found.lineIndex + 1,
    endLine,
  }
}

/** 统计字数：去掉空白后的字符数（中英文混排） */
export const countTextUnits = (text: string) => text.replace(/\s/g, '').length

/** 从章节正文拆出关键要点 */
export const extractKeyPoints = (body: string): string[] => {
  const trimmed = body.trim()
  if (!trimmed) return []

  const lines = trimmed.split('\n')
  const subHeadingRe = /^#{2,6}\s+/
  const bulletRe = /^(\s*[-*+]|\s*\d+[.)])\s+/

  const subSections: string[] = []
  let buf: string[] = []

  const flushBuf = () => {
    const t = buf.join('\n').trim()
    if (t) subSections.push(t)
    buf = []
  }

  for (const line of lines) {
    if (subHeadingRe.test(line)) {
      flushBuf()
      subSections.push(line.replace(/^#+\s+/, '').trim())
      continue
    }
    if (bulletRe.test(line)) {
      flushBuf()
      subSections.push(line.replace(bulletRe, '').trim())
      continue
    }
    buf.push(line)
  }
  flushBuf()

  if (subSections.length > 1) return subSections.filter((s) => s.length > 0)

  const paragraphs = trimmed.split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0)
  if (paragraphs.length > 1) return paragraphs

  const sentences = trimmed
    .split(/[。！？；\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4)
  if (sentences.length > 1) return sentences

  return [trimmed]
}

const formatOutputHint = (mode: 'list' | 'prose' | 'auto') => {
  if (mode === 'list') return '分条列举：每个要点单独成段或列表项，保留条目结构。'
  if (mode === 'prose') return '连贯成文：将各要点扩写后合并为连贯段落，不要分条标题。'
  return '按用户要求或内容性质自动选择：技术条目多用分条，叙述性内容合并成段。'
}

export const runExpandChapter = async (
  input: ExpandChapterInput,
): Promise<{ ok: true; content: string; summary: string } | { ok: false; error: string }> => {
  const read = await readProjectFile(input.projectRoot, input.filePath)
  if (!read.ok) return { ok: false, error: read.error }

  const section = extractChapterSection(read.content, input.chapterHeading)
  if (!section.ok) return { ok: false, error: section.error }

  const keyPoints = extractKeyPoints(section.body)
  if (!keyPoints.length) return { ok: false, error: 'Chapter body is empty' }

  const currentCount = countTextUnits(section.body)
  const target = input.targetWordCount && input.targetWordCount > 0 ? input.targetWordCount : 0
  const perPoint =
    target > 0 ? Math.max(1, Math.ceil((target - currentCount) / keyPoints.length)) : 0

  const lines: string[] = []
  lines.push('# ExpandChapter 扩写工作流')
  lines.push('')
  lines.push(`- 文件: ${input.filePath}`)
  lines.push(`- 章节标题: ${'#'.repeat(section.headingLevel)} ${section.heading}`)
  lines.push(`- 行范围: ${section.startLine}-${section.endLine}`)
  lines.push(`- 当前字数: ${currentCount}`)
  if (target > 0) lines.push(`- 目标字数: ${target}`)
  lines.push(`- 输出形式: ${input.outputFormat}`)
  lines.push('')
  lines.push('## 执行步骤（请严格按序）')
  lines.push('1. 若尚未 Read 该文件，先 Read。')
  lines.push('2. 针对下方「关键要点」逐条扩写：丰富论据、细化表述、补足逻辑。')
  if (perPoint > 0) {
    lines.push(`3. 每条要点约扩写 ${perPoint} 字（使全文接近目标字数）。`)
  } else {
    lines.push('3. 按用户要求的总字数控制扩写幅度。')
  }
  lines.push(`4. 成稿格式：${formatOutputHint(input.outputFormat)}`)
  lines.push('5. 合并各要点扩写结果，用 Edit 替换原章节正文（保留章节标题行不变）。')
  lines.push('')
  if (input.requirements.trim()) {
    lines.push('## 用户附加要求')
    lines.push(input.requirements.trim())
    lines.push('')
  }
  lines.push('## 关键要点（逐条处理）')
  keyPoints.forEach((p, i) => {
    lines.push(`${i + 1}. ${p.replace(/\n/g, ' ')}`)
  })
  lines.push('')
  lines.push('## 章节原文（待扩写）')
  lines.push(section.body)

  const summary = `扩写 ${input.filePath}「${section.heading}」${keyPoints.length} 要点`
  return { ok: true, content: lines.join('\n'), summary }
}

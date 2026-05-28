import type { AgentToolCall } from '../agent-types'
import type { AgentContext, ToolRunResult } from '../tool-executor'
import { runExpandChapter } from './expand-chapter'
import { runSummarizeChapter } from './summarize-chapter'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

const outputFormat = (v: unknown): 'list' | 'prose' | 'auto' => {
  if (v === 'list' || v === 'prose' || v === 'auto') return v
  return 'auto'
}

/** 复杂 tool 的执行逻辑；未识别的 tool 返回 null，由基础 executor 继续处理 */
export const executeComplexAgentTool = async (
  ctx: AgentContext,
  call: AgentToolCall,
): Promise<ToolRunResult | null> => {
  const args = call.arguments
  const file_path = str(args.file_path).trim()
  const chapter_heading = str(args.chapter_heading).trim()

  if (call.name === 'ExpandChapter') {
    if (!file_path) {
      return {
        kind: 'immediate',
        content: 'Error: file_path is required',
        log: { name: 'ExpandChapter', summary: 'ExpandChapter', ok: false },
      }
    }
    if (!chapter_heading) {
      return {
        kind: 'immediate',
        content: 'Error: chapter_heading is required',
        log: { name: 'ExpandChapter', summary: 'ExpandChapter', ok: false },
      }
    }

    const res = await runExpandChapter({
      projectRoot: ctx.projectRoot,
      filePath: file_path,
      chapterHeading: chapter_heading,
      targetWordCount: num(args.target_word_count),
      outputFormat: outputFormat(args.output_format),
      requirements: str(args.requirements),
    })

    if (!res.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${res.error}`,
        log: { name: 'ExpandChapter', summary: `ExpandChapter ${file_path}`, ok: false },
      }
    }

    return {
      kind: 'immediate',
      content: res.content,
      log: { name: 'ExpandChapter', summary: res.summary, ok: true },
    }
  }

  if (call.name === 'SummarizeChapter') {
    if (!file_path) {
      return {
        kind: 'immediate',
        content: 'Error: file_path is required',
        log: { name: 'SummarizeChapter', summary: 'SummarizeChapter', ok: false },
      }
    }
    if (!chapter_heading) {
      return {
        kind: 'immediate',
        content: 'Error: chapter_heading is required',
        log: { name: 'SummarizeChapter', summary: 'SummarizeChapter', ok: false },
      }
    }

    const res = await runSummarizeChapter({
      projectRoot: ctx.projectRoot,
      filePath: file_path,
      chapterHeading: chapter_heading,
      maxPoints: num(args.max_points),
      focus: str(args.focus),
    })

    if (!res.ok) {
      return {
        kind: 'immediate',
        content: `Error: ${res.error}`,
        log: { name: 'SummarizeChapter', summary: `SummarizeChapter ${file_path}`, ok: false },
      }
    }

    return {
      kind: 'immediate',
      content: res.content,
      log: { name: 'SummarizeChapter', summary: res.summary, ok: true },
    }
  }

  return null
}

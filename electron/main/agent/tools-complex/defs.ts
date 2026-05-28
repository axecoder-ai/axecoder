import type { AgentToolDef } from '../agent-types'

/** 复杂 tool 的 schema，每加一个 tool 在此追加一项 */
export const COMPLEX_AGENT_TOOLS: AgentToolDef[] = [
  {
    name: 'ExpandChapter',
    description:
      'Locate a markdown chapter by heading, extract key points, and return an expansion workflow. Use when the user asks to expand/elaborate a chapter; then expand each key point and apply via Edit.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative path under project root, e.g. docs/chapter.md',
        },
        chapter_heading: {
          type: 'string',
          description: 'Chapter heading text to match, with or without # marks, e.g. 技术方案',
        },
        target_word_count: {
          type: 'number',
          description: 'Target character count after expansion (non-whitespace chars)',
        },
        output_format: {
          type: 'string',
          enum: ['list', 'prose', 'auto'],
          description: 'list: bullet sections; prose: merged paragraphs; auto: decide by content',
        },
        requirements: {
          type: 'string',
          description: 'Extra user requirements for tone, structure, or constraints',
        },
      },
      required: ['file_path', 'chapter_heading'],
    },
  },
  {
    name: 'SummarizeChapter',
    description:
      'Locate a markdown chapter and extract numbered key points (1, 2, 3…) from messy or lengthy body text. Use when content is hard to follow and the user needs a structured summary before rewrite or expansion.',
    parameters: {
      type: 'object',
      properties: {
        file_path: {
          type: 'string',
          description: 'Relative path under project root, e.g. docs/chapter.md',
        },
        chapter_heading: {
          type: 'string',
          description: 'Chapter heading to match, with or without # marks',
        },
        max_points: {
          type: 'number',
          description: 'Optional cap on number of key points returned',
        },
        focus: {
          type: 'string',
          description: 'Optional user focus, e.g. 只提炼风险与交付物',
        },
      },
      required: ['file_path', 'chapter_heading'],
    },
  },
]

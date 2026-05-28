import type {
  BackgroundParameter,
  BackgroundParameterKind,
  BackgroundProjectInfo,
} from '../../src/utils/background-materials'
import { PROJECT_INFO_KEYS, paramDedupeKey } from '../../src/utils/background-materials'
import { getModelById } from './models-store'
import { getSecret } from './secrets-store'
import { chatWithProvider } from './ai/chat-with-provider'

/** 第 1 轮：候选文件摘要 */
const MAX_AI_FILE_CHARS_ROUND1 = 14000
/** 第 2 轮：单段全文上限（超大文件分多段投递） */
const MAX_AI_CHUNK_CHARS = 96000
const MAX_AI_CANDIDATES_ROUND1 = 40
const MAX_AI_FILES_ROUND2 = 120
const MAX_PROJECT_INFO_CHARS = 48000

const AI_SYSTEM_PROJECT = `你是标书项目信息提取助手。从招标/标书文件摘录中识别项目摘要，输出一行合法 JSON（不要 markdown 代码块）：
{"projectName":"项目名称","projectCode":"项目编号或编码","purchaser":"采购人或招标人","projectAmount":"预算/限价（保留单位）","servicePeriod":"服务周期或工期","bidDeadline":"投标截止时间","location":"建设或服务地点","qualification":"资质业绩要求一句","paymentTerms":"付款节点","warranty":"质保与售后","extra":"其它重要信息"}
字段可省略；无法判断则输出 {}`

const AI_SYSTEM_ROUND1 = `你是标书参数提取助手。从文件中提取两类条目：

1. **技术参数**（kind: "technical"）：软硬件版本、框架、数据库、部署环境、接口协议、性能与安全指标等。
2. **商务参数**（kind: "business"）：资质、业绩、服务、培训售后、人员、合同商务条款、验收付款等（非纯技术指标）。

对每个文件先思考，再输出一行合法 JSON（不要 markdown 代码块）：
{"parameters":[{"id":"1","title":"SpringBoot 2.7.10","kind":"technical"},{"id":"2","title":"类似项目业绩不少于2个","kind":"business"}]}
若无任何参数：{"parameters":[]}
id 从 1 起连续；title 不超过 80 字；kind 只能是 technical 或 business。`

const AI_SYSTEM_ROUND2 = `你是标书参数提取助手（第 2 轮全文通读）。首轮未提取充分，现提供文件全部正文，请仔细阅读后提取**技术参数**与**商务参数**两类。

技术类：软硬件、版本、部署、接口、性能、安全等。
商务类：资质、业绩、服务、培训售后、人员、合同与验收等。

先充分思考，再输出一行合法 JSON：
{"parameters":[{"id":"1","title":"简短标题","kind":"technical"}]}
kind 为 technical 或 business。`

export type InitAiProgress = {
  phase: 'think' | 'act'
  relativePath: string
  text: string
  current: number
  total: number
  round: 1 | 2
  chunk?: { index: number; total: number }
}

export type ExtractTechParamsOptions = {
  round: 1 | 2
  fullContent?: boolean
}

export const splitContentForAiChunks = (content: string, maxChars: number): string[] => {
  if (content.length <= maxChars) return [content]
  const chunks: string[] = []
  let start = 0
  while (start < content.length) {
    let end = Math.min(start + maxChars, content.length)
    if (end < content.length) {
      const nl = content.lastIndexOf('\n', end)
      if (nl > start + maxChars * 0.5) end = nl + 1
    }
    chunks.push(content.slice(start, end))
    start = end
  }
  return chunks
}

export const parseAiParametersJson = (
  raw: string,
): { id: string; title: string; kind: BackgroundParameterKind }[] => {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*"parameters"[\s\S]*\}/)
  const jsonText = jsonMatch ? jsonMatch[0] : trimmed
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return []
  }
  if (!parsed || typeof parsed !== 'object') return []
  const params = (parsed as { parameters?: unknown }).parameters
  if (!Array.isArray(params)) return []
  const out: { id: string; title: string; kind: BackgroundParameterKind }[] = []
  for (const item of params) {
    if (!item || typeof item !== 'object') continue
    const row = item as { id?: unknown; title?: unknown; kind?: unknown }
    const id = typeof row.id === 'string' ? row.id.trim() : String(row.id ?? '').trim()
    const title = typeof row.title === 'string' ? row.title.trim() : ''
    const kind: BackgroundParameterKind = row.kind === 'business' ? 'business' : 'technical'
    if (!id || !title) continue
    out.push({ id, title: title.slice(0, 200), kind })
  }
  return out
}

export const parseAiProjectInfoJson = (raw: string): BackgroundProjectInfo => {
  const trimmed = raw.trim()
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/)
  const jsonText = jsonMatch ? jsonMatch[0] : trimmed
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    return {}
  }
  if (!parsed || typeof parsed !== 'object') return {}
  const row = parsed as Record<string, unknown>
  const pick = (key: keyof BackgroundProjectInfo) => {
    const v = row[key]
    return typeof v === 'string' && v.trim() ? v.trim().slice(0, 300) : undefined
  }
  return Object.fromEntries(
    PROJECT_INFO_KEYS.map((key) => [key, pick(key)]).filter(([, v]) => v),
  ) as BackgroundProjectInfo
}

/** 一次调用从招标/磋商摘录提取项目信息 */
export const extractProjectInfoWithAi = async (
  modelId: string,
  parts: { relativePath: string; content: string }[],
  onAi?: (payload: InitAiProgress) => void,
): Promise<BackgroundProjectInfo> => {
  if (!parts.length) return {}
  const model = await getModelById(modelId)
  if (!model) throw new Error('模型不存在，请先在设置中配置模型')
  if (!model.enabled) throw new Error('当前模型已禁用')
  const apiKey = await getSecret(modelId)

  const blocks: string[] = []
  let used = 0
  for (const { relativePath, content } of parts) {
    const head = `\n\n## ${relativePath}\n`
    const room = MAX_PROJECT_INFO_CHARS - used - head.length
    if (room < 500) break
    const slice = content.length > room ? content.slice(0, room) + '\n…(已截断)' : content
    blocks.push(head + slice)
    used += head.length + slice.length
  }

  onAi?.({
    phase: 'think',
    relativePath: parts[0].relativePath,
    current: 1,
    total: 1,
    round: 1,
    text: '识别项目名称、招商单位、项目金额…',
  })

  const res = await chatWithProvider(model, apiKey, [
    { role: 'system', content: AI_SYSTEM_PROJECT },
    {
      role: 'user',
      content: ['以下为招标/磋商文件摘录，请提取项目信息：', '---', blocks.join('')].join('\n\n'),
    },
  ])

  if (!res.ok) {
    onAi?.({
      phase: 'act',
      relativePath: parts[0].relativePath,
      current: 1,
      total: 1,
      round: 1,
      text: `项目信息识别失败：${res.error}`,
    })
    return {}
  }

  const info = parseAiProjectInfoJson(res.text)
  const filled = PROJECT_INFO_KEYS.filter((k) => info[k]?.trim()).length
  onAi?.({
    phase: 'act',
    relativePath: parts[0].relativePath,
    current: 1,
    total: 1,
    round: 1,
    text: filled > 0 ? `已识别项目信息 ${filled} 项` : '未识别到项目信息',
  })
  return info
}

export const mergeAiAndRuleParameters = (
  aiParams: BackgroundParameter[],
  ruleParams: BackgroundParameter[],
): BackgroundParameter[] => {
  const byId = new Map<string, BackgroundParameter>()
  for (const p of ruleParams) byId.set(paramDedupeKey(p), p)
  let nextAuto = byId.size + 1
  for (const p of aiParams) {
    const k = paramDedupeKey(p)
    if (!byId.has(k)) {
      byId.set(k, p)
      continue
    }
    const autoId = String(nextAuto++)
    const kind = p.kind ?? 'technical'
    byId.set(paramDedupeKey({ ...p, id: autoId }), { ...p, id: autoId, label: `参数${autoId}`, kind })
  }
  return [...byId.values()].sort((a, b) => {
    const ka = a.kind ?? 'technical'
    const kb = b.kind ?? 'technical'
    if (ka !== kb) return ka === 'business' ? -1 : 1
    return Number(a.id) - Number(b.id)
  })
}

/** 逐文件（可多段全文）调用大模型提取技术/商务参数 */
export const extractTechParamsWithAi = async (
  modelId: string,
  candidates: { relativePath: string; content: string }[],
  onAi?: (payload: InitAiProgress) => void,
  options?: ExtractTechParamsOptions,
): Promise<BackgroundParameter[]> => {
  const round = options?.round ?? 1
  const fullContent = options?.fullContent ?? round === 2

  const model = await getModelById(modelId)
  if (!model) throw new Error('模型不存在，请先在设置中配置模型')
  if (!model.enabled) throw new Error('当前模型已禁用')
  const apiKey = await getSecret(modelId)

  const maxFiles = round === 2 ? MAX_AI_FILES_ROUND2 : MAX_AI_CANDIDATES_ROUND1
  const list = candidates.slice(0, maxFiles)
  const systemPrompt = round === 2 ? AI_SYSTEM_ROUND2 : AI_SYSTEM_ROUND1
  const all: BackgroundParameter[] = []
  let globalId = 1

  const tasks: { relativePath: string; chunk: string; chunkIndex: number; chunkTotal: number }[] = []
  for (const { relativePath, content } of list) {
    const chunks = fullContent
      ? splitContentForAiChunks(content, MAX_AI_CHUNK_CHARS)
      : [
          content.length > MAX_AI_FILE_CHARS_ROUND1
            ? content.slice(0, MAX_AI_FILE_CHARS_ROUND1) + '\n…(首轮已截断)'
            : content,
        ]
    for (let ci = 0; ci < chunks.length; ci++) {
      tasks.push({
        relativePath,
        chunk: chunks[ci],
        chunkIndex: ci + 1,
        chunkTotal: chunks.length,
      })
    }
  }

  const total = tasks.length

  for (let i = 0; i < tasks.length; i++) {
    const { relativePath, chunk, chunkIndex, chunkTotal } = tasks[i]
    const current = i + 1
    const chunkMeta = chunkTotal > 1 ? { index: chunkIndex, total: chunkTotal } : undefined
    const roundLabel = round === 2 ? '第2轮全文' : '第1轮'

    onAi?.({
      phase: 'think',
      relativePath,
      current,
      total,
      round,
      chunk: chunkMeta,
      text:
        chunkTotal > 1
          ? `${roundLabel}：通读 ${relativePath}（第 ${chunkIndex}/${chunkTotal} 段），识别技术/商务参数…`
          : `${roundLabel}：分析 ${relativePath}（技术+商务）…`,
    })

    const userParts = [`文件路径：${relativePath}`]
    if (chunkTotal > 1) {
      userParts.push(`分段：${chunkIndex}/${chunkTotal}（请在本段内提取，可与其它段合并理解）`)
    }
    if (fullContent) {
      userParts.push('以下为文件正文（请完整阅读后判断）：')
    }
    userParts.push('---', chunk)

    const res = await chatWithProvider(model, apiKey, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userParts.join('\n\n') },
    ])

    if (!res.ok) {
      onAi?.({
        phase: 'act',
        relativePath,
        current,
        total,
        round,
        chunk: chunkMeta,
        text: `模型调用失败：${res.error}`,
      })
      continue
    }

    if (res.reasoningContent?.trim()) {
      onAi?.({
        phase: 'think',
        relativePath,
        current,
        total,
        round,
        chunk: chunkMeta,
        text: res.reasoningContent.trim().slice(0, 800),
      })
    }

    const parsed = parseAiParametersJson(res.text)
    const techN = parsed.filter((p) => p.kind === 'technical').length
    const bizN = parsed.length - techN
    onAi?.({
      phase: 'act',
      relativePath,
      current,
      total,
      round,
      chunk: chunkMeta,
      text:
        parsed.length > 0
          ? `提取 ${parsed.length} 条（技术 ${techN}，商务 ${bizN}）`
          : '本段未识别到参数',
    })

    for (const row of parsed) {
      const id = String(globalId++)
      all.push({
        id,
        label: `参数${id}`,
        title: row.title,
        status: 'pending',
        kind: row.kind,
        sourcePath: relativePath,
      })
    }
  }

  const byId = new Map<string, BackgroundParameter>()
  for (const p of all) {
    const k = paramDedupeKey(p)
    if (!byId.has(k)) byId.set(k, p)
  }
  return [...byId.values()].sort((a, b) => {
    const ka = a.kind ?? 'technical'
    const kb = b.kind ?? 'technical'
    if (ka !== kb) return ka === 'business' ? -1 : 1
    return Number(a.id) - Number(b.id)
  })
}

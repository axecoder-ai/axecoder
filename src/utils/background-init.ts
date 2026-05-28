import type {
  BackgroundManifest,
  BackgroundManifestCategory,
  BackgroundParameter,
  BackgroundParameterKind,
  BackgroundProjectInfo,
} from './background-materials'
import {
  AI_CONTEXT_EXT,
  dedupePaths,
  hasBackgroundProjectInfo,
  PROJECT_INFO_KEYS,
  paramDedupeKey,
} from './background-materials'

const PARAM_HEAD_RE = /^参数(\d+)[（(]([^）)]+)[）)]\s*$/
const PARAM_RESPONSE_RE = /对应参数\s*(\d+)/g

/** 宽松：参数1：标题 / ### 参数1 标题 / 【参数1】标题 */
const PARAM_RELAXED_RES: RegExp[] = [
  /^#{0,6}\s*参数\s*(\d+)\s*[：:．.\-、\s]+(.+)$/i,
  /^参数\s*(\d+)\s*[：:．.\-、\s]+(.+)$/,
  /^【\s*参数\s*(\d+)\s*】\s*(.+)$/,
  /^参数\s*(\d+)\s+(.+)$/,
]

const FALLBACK_HEADING_RE = /^#{2,4}\s+(.+?)\s*$/
const FALLBACK_NUMBERED_RE = /^(\d{1,3})[.、．)]\s*(.+)$/
const FALLBACK_BULLET_RE = /^[-*+]\s+(.+)$/

const NOISE_TITLE_RE =
  /^(来源|参数汇总|目录|附录|修订|说明|概述|参考文献|前言|正文|附件|#+\s*$|参数\s*汇总)/i

const MAX_PARAMS_PER_FILE = 120
const MAX_TITLE_LEN = 200

export type BackgroundScanBucket =
  | 'params'
  | 'tender'
  | 'negotiation'
  | 'proposal'
  | 'background'

const CATEGORY_ORDER: BackgroundScanBucket[] = [
  'params',
  'tender',
  'negotiation',
  'proposal',
  'background',
]

const CATEGORY_LABELS: Record<BackgroundScanBucket, string> = {
  params: '参数',
  tender: '招标文件',
  negotiation: '磋商文件',
  proposal: '技术方案',
  background: '背景资料',
}

const PROPOSAL_PATH_RE = /技术方案|投标方案|投标文件|响应文件|投标响应|实施方案|方案书|正文/i
const PROPOSAL_BASE_RE = /技术方案|投标|响应|proposal|technical_proposal/i

const isScannableName = (name: string) => AI_CONTEXT_EXT.test(name)

/** init 时会尝试读取内容的扩展名 */
export const isInitReadableRelativePath = (relativePath: string) => {
  const base = relativePath.replace(/\\/g, '/').split('/').pop() ?? relativePath
  return AI_CONTEXT_EXT.test(base)
}

/** 技术方案 / 投标响应类文档（用于对照参数是否已响应） */
export const isProposalRelativePath = (relativePath: string) =>
  classifyBackgroundRelativePath(relativePath) === 'proposal'

/** 用于检测参数响应的正文（md/txt/markdown，非参数源与 .writcraft） */
export const isInitResponseCheckRelativePath = (relativePath: string) => {
  const norm = relativePath.replace(/\\/g, '/')
  const base = norm.split('/').pop() ?? norm
  if (!/\.(md|txt|markdown)$/i.test(base)) return false
  if (classifyBackgroundRelativePath(relativePath) === 'params') return false
  if (norm.includes('/.writcraft/') || norm.startsWith('.writcraft/')) return false
  return true
}

/** 单文件只归入一类；优先级 params > tender > negotiation > proposal > background */
export const classifyBackgroundRelativePath = (relativePath: string): BackgroundScanBucket | null => {
  const norm = relativePath.replace(/\\/g, '/')
  const lower = norm.toLowerCase()
  const base = norm.split('/').pop() ?? norm
  if (isUnderHiddenPathSegment(norm)) return null
  if (!isScannableName(base)) return null
  if (lower.includes('/.writcraft/') || lower.startsWith('.writcraft/')) {
    if (base === '参数汇总.md' || base === 'background.json') return null
  }
  if (isParamSourceRelativePath(norm)) return 'params'
  if (/标书|招标文件|采购文件|招标公告|采购需求|投标邀请/.test(base)) return 'tender'
  if (/招标/.test(norm)) return 'tender'
  if (/磋商/.test(norm)) return 'negotiation'
  if (PROPOSAL_PATH_RE.test(norm) || PROPOSAL_BASE_RE.test(base)) return 'proposal'
  if (/背景|未来资料|背景资料|reference/i.test(norm)) return 'background'
  return null
}

export const emptyScanBuckets = (): Record<BackgroundScanBucket, string[]> => ({
  params: [],
  tender: [],
  negotiation: [],
  proposal: [],
  background: [],
})

export const bucketRelativePaths = (
  relativePaths: string[],
): Record<BackgroundScanBucket, string[]> => {
  const buckets = emptyScanBuckets()
  for (const rel of relativePaths) {
    const bucket = classifyBackgroundRelativePath(rel)
    if (!bucket) continue
    buckets[bucket].push(rel.replace(/\\/g, '/'))
  }
  for (const key of CATEGORY_ORDER) {
    buckets[key] = [...new Set(buckets[key])].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' }),
    )
  }
  return buckets
}

export const PARAMS_SUMMARY_REL = '.writcraft/参数汇总.md'

const TECH_PARAM_PATH_RE = /技术参数/i
const BUSINESS_PARAM_PATH_RE = /商务参数|商务要求/i
const TECH_PARAM_HEADING_RE =
  /^#{1,6}\s*[^\n]*(技术参数|技术规格|技术要求|技术指标|软硬件|部署环境|系统架构|功能与技术)/i
const BUSINESS_PARAM_HEADING_RE =
  /^#{1,6}\s*[^\n]*(商务参数|商务要求|资质要求|服务要求|业绩要求|培训与售后)/i

type ParamTextBlock = { text: string; kind: BackgroundParameterKind | 'any' }

/** 相对路径落在以 . 开头的目录下（隐藏目录） */
export const isUnderHiddenPathSegment = (relativePath: string) => {
  const norm = relativePath.replace(/\\/g, '/')
  return norm.split('/').some((seg) => seg.length > 0 && seg.startsWith('.'))
}

/** 路径为技术参数专文件 */
export const isTechnicalParamRelativePath = (rel: string) => {
  const norm = rel.replace(/\\/g, '/')
  if (isUnderHiddenPathSegment(norm)) return false
  if (TECH_PARAM_PATH_RE.test(norm)) return true
  const base = norm.split('/').pop() ?? norm
  return /^技术.+参数/i.test(base)
}

/** 路径为商务参数专文件 */
export const isBusinessParamRelativePath = (rel: string) => {
  const norm = rel.replace(/\\/g, '/')
  if (isUnderHiddenPathSegment(norm)) return false
  if (BUSINESS_PARAM_PATH_RE.test(norm)) return true
  const base = norm.split('/').pop() ?? norm
  return /^商务.+参数/i.test(base)
}

/** manifest paths 中可作为参数来源（技术 + 商务；排除汇总与 .writcraft） */
export const isParamSourceRelativePath = (rel: string) => {
  const norm = rel.replace(/\\/g, '/')
  const base = norm.split('/').pop() ?? norm
  if (base === '参数汇总.md' || base === 'background.json') return false
  if (norm.includes('/.writcraft/') || norm.startsWith('.writcraft/')) return false
  if (isTechnicalParamRelativePath(norm) || isBusinessParamRelativePath(norm)) return true
  return /^参数(\.md|汇总\.md)$/i.test(base)
}

/** 侧栏重载时可解析参数条目的路径（含 .writcraft/参数汇总.md） */
export const isParamParseableRelativePath = (rel: string) => {
  const norm = rel.replace(/\\/g, '/')
  const base = norm.split('/').pop() ?? norm
  if (base === 'background.json') return false
  if (base === '参数汇总.md') return true
  return isParamSourceRelativePath(rel)
}

const stripLineMarkup = (line: string) =>
  line
    .trim()
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .trim()

const isUsableParamTitle = (title: string) => {
  const t = title.trim()
  if (t.length < 2 || t.length > MAX_TITLE_LEN) return false
  if (NOISE_TITLE_RE.test(t)) return false
  if (/^#+\s*$/.test(t)) return false
  return true
}

const looksLikeTechnicalSpecLine = (text: string) =>
  /[：:]\s*\S/.test(text) ||
  /\d+\.\d+/.test(text) ||
  /须|应|需|不低|不少于|支持|采用|版本|框架|数据库|接口|部署|环境|中间件|JDK|MySQL|Redis|Nginx|Spring|Vue|Tomcat|HTTPS|JWT|端口|超时|分页|CPU|GPU|内存|带宽|集群|容器|Docker|K8s|Linux|Windows|CentOS|Ubuntu|JSON|XML|API|SDK|GB|TB|MHz|GHz/.test(
    text,
  )

const inferParamKind = (title: string): BackgroundParameterKind =>
  looksLikeTechnicalSpecLine(title) ? 'technical' : 'business'

const titleMatchesBlockKind = (title: string, blockKind: ParamTextBlock['kind']) => {
  if (!isUsableParamTitle(title)) return false
  if (blockKind === 'any') return true
  if (blockKind === 'technical') return looksLikeTechnicalSpecLine(title) || /^参数\d/.test(title)
  return !looksLikeTechnicalSpecLine(title) || /商务|资质|业绩|服务|培训|售后|合同|人员/.test(title)
}

/** 提取技术/商务参数章节；专文件则全文 */
export const extractParamTextBlocks = (content: string, sourcePath?: string): ParamTextBlock[] => {
  if (sourcePath && isBusinessParamRelativePath(sourcePath)) {
    return [{ text: content, kind: 'business' }]
  }
  if (sourcePath && isTechnicalParamRelativePath(sourcePath)) {
    return [{ text: content, kind: 'technical' }]
  }

  const blocks: ParamTextBlock[] = []
  let buf: string[] = []
  let blockKind: BackgroundParameterKind | null = null

  for (const raw of content.split(/\r?\n/)) {
    const t = raw.trim()
    if (/^#{1,6}\s+/.test(t)) {
      if (blockKind && buf.length) blocks.push({ text: buf.join('\n'), kind: blockKind })
      buf = []
      if (TECH_PARAM_HEADING_RE.test(t)) blockKind = 'technical'
      else if (BUSINESS_PARAM_HEADING_RE.test(t)) blockKind = 'business'
      else blockKind = null
      continue
    }
    if (blockKind) buf.push(raw)
  }
  if (blockKind && buf.length) blocks.push({ text: buf.join('\n'), kind: blockKind })

  if (!blocks.length && sourcePath) {
    const base = sourcePath.replace(/\\/g, '/').split('/').pop() ?? sourcePath
    if (/^参数(\.md|汇总\.md)$/i.test(base)) {
      return [{ text: content, kind: 'any' }]
    }
  }
  return blocks
}

/** @deprecated 使用 extractParamTextBlocks */
export const extractTechnicalParamTextBlocks = (content: string, sourcePath?: string): string[] =>
  extractParamTextBlocks(content, sourcePath).map((b) => b.text)

const parseParamBlock = (
  content: string,
  blockKind: ParamTextBlock['kind'],
  sourcePath: string | undefined,
  byId: Map<string, BackgroundParameter>,
  autoSeqRef: { n: number },
) => {
  const put = (id: string, title: string, kind: BackgroundParameterKind) => {
    if (byId.size >= MAX_PARAMS_PER_FILE) return
    const t = title.trim().slice(0, MAX_TITLE_LEN)
    if (!titleMatchesBlockKind(t, blockKind)) return
    const key = id.trim()
    const dedupe = paramDedupeKey({ id: key, label: '', title: t, status: 'pending', kind })
    if (!key || byId.has(dedupe)) return
    byId.set(dedupe, {
      id: key,
      label: `参数${key}`,
      title: t,
      status: 'pending',
      kind,
      sourcePath,
    })
  }

  const putAuto = (title: string, kind: BackgroundParameterKind) => {
    let autoSeq = autoSeqRef.n
    while (byId.has(paramDedupeKey({ id: String(autoSeq), label: '', title: '', status: 'pending', kind }))) {
      autoSeq++
    }
    put(String(autoSeq), title, kind)
    autoSeqRef.n = autoSeq + 1
  }

  const lines = content.split(/\r?\n/)

  for (const raw of lines) {
    const line = stripLineMarkup(raw)
    const m = line.match(PARAM_HEAD_RE)
    if (!m) continue
    const kind = blockKind === 'any' ? inferParamKind(m[2]) : blockKind
    put(m[1], m[2], kind)
  }

  for (const raw of lines) {
    const line = stripLineMarkup(raw)
    if (PARAM_HEAD_RE.test(line)) continue
    for (const re of PARAM_RELAXED_RES) {
      const m = line.match(re)
      if (!m) continue
      const kind = blockKind === 'any' ? inferParamKind(m[2]) : blockKind
      if (titleMatchesBlockKind(m[2], blockKind)) {
        put(m[1], m[2], kind)
        break
      }
    }
  }

  for (const raw of lines) {
    const t = raw.trim()
    const hm = t.match(FALLBACK_HEADING_RE)
    if (!hm) continue
    const title = stripLineMarkup(hm[1])
    if (TECH_PARAM_HEADING_RE.test(t) || BUSINESS_PARAM_HEADING_RE.test(t)) continue
    const kind = blockKind === 'any' ? inferParamKind(title) : blockKind
    if (titleMatchesBlockKind(title, blockKind)) putAuto(title, kind)
  }

  for (const raw of lines) {
    const line = stripLineMarkup(raw)
    const m = line.match(FALLBACK_NUMBERED_RE)
    if (!m) continue
    const title = m[2].trim()
    const kind = blockKind === 'any' ? inferParamKind(title) : blockKind
    if (titleMatchesBlockKind(title, blockKind)) put(m[1], title, kind)
  }

  for (const raw of lines) {
    const t = raw.trim()
    const bm = t.match(FALLBACK_BULLET_RE)
    if (!bm) continue
    const title = stripLineMarkup(bm[1])
    const kind = blockKind === 'any' ? inferParamKind(title) : blockKind
    if (titleMatchesBlockKind(title, blockKind)) putAuto(title, kind)
  }

  for (const raw of lines) {
    const t = raw.trim()
    if (!t || /^#{1,6}\s/.test(t)) continue
    if (FALLBACK_BULLET_RE.test(t)) continue
    const line = stripLineMarkup(t)
    if (FALLBACK_NUMBERED_RE.test(line) || PARAM_HEAD_RE.test(line)) continue
    const kind = blockKind === 'any' ? inferParamKind(line) : blockKind
    if (titleMatchesBlockKind(line, blockKind)) putAuto(line, kind)
  }
}

/** 从技术/商务参数文件或对应章节解析条目 */
export const parseParametersFromText = (
  content: string,
  sourcePath?: string,
): BackgroundParameter[] => {
  const blocks = extractParamTextBlocks(content, sourcePath)
  if (!blocks.length) return []

  const byId = new Map<string, BackgroundParameter>()
  const autoSeqRef = { n: 1 }
  for (const block of blocks) {
    parseParamBlock(block.text, block.kind, sourcePath, byId, autoSeqRef)
  }
  return [...byId.values()].sort((a, b) => {
    const ka = a.kind ?? 'technical'
    const kb = b.kind ?? 'technical'
    if (ka !== kb) return ka === 'business' ? -1 : 1
    return Number(a.id) - Number(b.id)
  })
}

/** 合并多来源参数，按 kind+id 去重（先出现的保留） */
export const mergeParsedParameters = (
  parts: { relativePath: string; content: string }[],
): BackgroundParameter[] => {
  const byId = new Map<string, BackgroundParameter>()
  for (const part of parts) {
    for (const p of parseParametersFromText(part.content, part.relativePath)) {
      const k = paramDedupeKey(p)
      if (!byId.has(k)) byId.set(k, p)
    }
  }
  return [...byId.values()].sort((a, b) => {
    const ka = a.kind ?? 'technical'
    const kb = b.kind ?? 'technical'
    if (ka !== kb) return ka === 'business' ? -1 : 1
    return Number(a.id) - Number(b.id)
  })
}

const normTextForParamMatch = (s: string) =>
  s
    .replace(/\s+/g, '')
    .replace(/[*_`#]/g, '')
    .toLowerCase()

/** 在技术方案正文中判定已响应：显式「对应参数N」+ 参数标题/编号出现在正文 */
export const findRespondedParameterIds = (
  texts: string[],
  parameters: BackgroundParameter[] = [],
): Set<string> => {
  const ids = new Set<string>()
  const combined = texts.join('\n')
  const combinedNorm = normTextForParamMatch(combined)

  for (const text of texts) {
    PARAM_RESPONSE_RE.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = PARAM_RESPONSE_RE.exec(text)) !== null) {
      ids.add(m[1])
    }
  }

  for (const p of parameters) {
    if (ids.has(p.id)) continue
    const title = p.title.trim()
    const titleNorm = normTextForParamMatch(title)
    if (titleNorm.length >= 4 && combinedNorm.includes(titleNorm)) {
      ids.add(p.id)
      continue
    }
    const labelNorm = normTextForParamMatch(p.label)
    if (labelNorm.length >= 3 && combinedNorm.includes(labelNorm)) {
      ids.add(p.id)
    }
  }

  return ids
}

/** 收集用于响应检测的正文：优先技术方案类，无则回退其它可检测文档 */
export const collectProposalResponseTexts = (
  parts: { relativePath: string; content: string }[],
): string[] => {
  const proposal: string[] = []
  const fallback: string[] = []
  for (const part of parts) {
    if (!isInitResponseCheckRelativePath(part.relativePath)) continue
    if (isProposalRelativePath(part.relativePath)) proposal.push(part.content)
    else fallback.push(part.content)
  }
  return proposal.length > 0 ? proposal : fallback
}

export const applyParameterResponseStatus = (
  parameters: BackgroundParameter[],
  respondedIds: Set<string>,
): BackgroundParameter[] =>
  parameters.map((p) => ({
    ...p,
    status: respondedIds.has(p.id) ? 'responded' : 'pending',
  }))

export const mergeParameterContents = (
  parts: { relativePath: string; content: string }[],
): string => {
  if (!parts.length) return ''
  const lines: string[] = ['# 参数汇总', '']
  for (const part of parts) {
    lines.push(`## 来源: ${part.relativePath}`)
    lines.push('')
    lines.push(part.content.trim())
    lines.push('')
  }
  return lines.join('\n').trimEnd() + '\n'
}

/** 可作为项目信息来源的标书/招标类文件 */
export const isProjectInfoSourceRelativePath = (relativePath: string) => {
  const norm = relativePath.replace(/\\/g, '/')
  const base = norm.split('/').pop() ?? norm
  const bucket = classifyBackgroundRelativePath(relativePath)
  if (bucket === 'tender' || bucket === 'negotiation') return true
  if (/标书|招标文件|采购文件|招标公告|采购需求|投标邀请|磋商文件/.test(base)) return true
  if (/标书|招标文件|采购文件|招标公告/.test(norm)) return true
  return false
}

const PROJECT_FIELD_RES: { key: keyof BackgroundProjectInfo; patterns: RegExp[] }[] = [
  {
    key: 'projectName',
    patterns: [
      /(?:项目名称|项目名|招标项目名称|采购项目名称)[：:\s]\s*(.+)$/i,
      /^\s*\|\s*(?:项目名称|项目名)\s*\|\s*(.+?)\s*\|/,
    ],
  },
  {
    key: 'projectCode',
    patterns: [
      /(?:项目编号|项目编码|采购编号|招标编号|项目代号)[：:\s]\s*(.+)$/i,
      /^\s*\|\s*(?:项目编号|项目编码|采购编号)\s*\|\s*(.+?)\s*\|/,
    ],
  },
  {
    key: 'purchaser',
    patterns: [
      /(?:招商单位|采购人|招标人|采购单位|招标单位|建设单位|业主单位|需求单位)[：:\s]\s*(.+)$/i,
      /^\s*\|\s*(?:招商单位|采购人|招标人)\s*\|\s*(.+?)\s*\|/,
    ],
  },
  {
    key: 'projectAmount',
    patterns: [
      /(?:项目金额|项目预算|预算金额|采购预算|最高限价|控制价|投标限价|合同估算价|总投资|预算价)[：:\s]\s*(.+)$/i,
      /^\s*\|\s*(?:项目金额|预算金额|最高限价|项目预算)\s*\|\s*(.+?)\s*\|/,
    ],
  },
  {
    key: 'servicePeriod',
    patterns: [
      /(?:服务周期|工期要求|服务期限|建设周期|合同履行期限|开发周期)[：:\s]\s*(.+)$/i,
    ],
  },
  {
    key: 'bidDeadline',
    patterns: [
      /(?:投标截止时间|递交截止时间|开标时间|报名截止时间|响应文件递交截止)[：:\s]\s*(.+)$/i,
    ],
  },
  {
    key: 'location',
    patterns: [
      /(?:建设地点|项目地点|服务地点|实施地点)[：:\s]\s*(.+)$/i,
    ],
  },
  {
    key: 'qualification',
    patterns: [
      /(?:投标人资格|资格要求|资质要求|投标人应具备|业绩要求)[：:\s]\s*(.+)$/i,
    ],
  },
  {
    key: 'paymentTerms',
    patterns: [
      /(?:付款方式|付款节点|支付方式|合同价款支付)[：:\s]\s*(.+)$/i,
    ],
  },
  {
    key: 'warranty',
    patterns: [
      /(?:质保期|质量保证期|售后服务|运维服务|保修期)[：:\s]\s*(.+)$/i,
    ],
  },
]

const trimProjectField = (s: string) => s.replace(/\s*[；;，,]\s*$/u, '').trim().slice(0, 300)

/** 从招标/磋商正文用规则提取项目信息 */
export const parseProjectInfoFromText = (content: string): BackgroundProjectInfo => {
  const info: BackgroundProjectInfo = {}
  const lines = content.split(/\r?\n/)
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue
    for (const { key, patterns } of PROJECT_FIELD_RES) {
      if (info[key]?.trim()) continue
      for (const re of patterns) {
        const m = line.match(re)
        if (!m?.[1]) continue
        const v = trimProjectField(m[1])
        if (v.length >= 2) info[key] = v
        break
      }
    }
  }
  return info
}

export const mergeProjectInfo = (
  base: BackgroundProjectInfo,
  patch: BackgroundProjectInfo,
): BackgroundProjectInfo => {
  const out: BackgroundProjectInfo = { ...base }
  for (const key of PROJECT_INFO_KEYS) {
    if (!out[key]?.trim() && patch[key]?.trim()) out[key] = patch[key]!.trim()
  }
  return out
}

/** 合并多份招标类文件的项目信息（先出现的字段优先） */
export const parseProjectInfoFromTexts = (
  parts: { relativePath: string; content: string }[],
): BackgroundProjectInfo => {
  let info: BackgroundProjectInfo = {}
  for (const part of parts) {
    info = mergeProjectInfo(info, parseProjectInfoFromText(part.content))
  }
  return info
}

/** 从已提取的商务参数标题补全 projectInfo 空缺字段 */
export const supplementProjectInfoFromParameters = (
  info: BackgroundProjectInfo,
  parameters: BackgroundParameter[],
): BackgroundProjectInfo => {
  const out: BackgroundProjectInfo = { ...info }
  for (const p of parameters) {
    const t = p.title.trim()
    if (!t) continue
    if (!out.projectCode?.trim() && /项目编号|项目编码|TEST-|采购编号/i.test(t)) {
      const m = t.match(/(?:项目编号|项目编码|采购编号)[：:\s]*([A-Za-z0-9-]+)/i)
      out.projectCode = m?.[1]?.trim() || t.slice(0, 80)
    }
    if (!out.projectAmount?.trim() && /项目预算|预算.*元|最高限价/i.test(t)) {
      out.projectAmount = t.replace(/^项目预算[：:]?\s*/i, '').trim() || t
    }
    if (!out.servicePeriod?.trim() && /服务周期|免费售后|运维/i.test(t)) {
      out.servicePeriod = t
    }
    if (!out.paymentTerms?.trim() && /付款|预付款|初验|终验|质保期满/i.test(t)) {
      out.paymentTerms = t
    }
    if (!out.warranty?.trim() && /质保|售后|7×24|7x24|响应/i.test(t)) {
      out.warranty = t
    }
    if (!out.qualification?.trim() && /业绩|联合体|失信|分包|转包|资质/i.test(t)) {
      out.qualification = out.qualification ? `${out.qualification}；${t}` : t
    }
  }
  return out
}

export const buildManifestFromBuckets = (
  buckets: Record<BackgroundScanBucket, string[]>,
  options?: {
    includeSummary?: boolean
    parameters?: BackgroundParameter[]
    projectInfo?: BackgroundProjectInfo
  },
): BackgroundManifest => {
  const categories: BackgroundManifestCategory[] = []
  for (const id of CATEGORY_ORDER) {
    let paths = [...buckets[id]]
    if (id === 'params' && options?.includeSummary) {
      paths = [PARAMS_SUMMARY_REL, ...paths.filter((p) => p !== PARAMS_SUMMARY_REL)]
    }
    paths = dedupePaths(paths.map((p) => p.replace(/\\/g, '/')))
    categories.push({
      id,
      label: CATEGORY_LABELS[id],
      paths,
      globs: [],
    })
  }
  const projectInfo =
    options?.projectInfo && hasBackgroundProjectInfo(options.projectInfo)
      ? options.projectInfo
      : undefined
  return {
    version: 1,
    projectInfo,
    parameters: options?.parameters?.length ? options.parameters : undefined,
    categories,
  }
}

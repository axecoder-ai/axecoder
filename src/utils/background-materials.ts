/** 与 Main `background-materials.ts` 扩展名判断保持一致 */
export const AI_CONTEXT_EXT = /\.(md|txt|markdown|json)$/i

export type BackgroundParameterStatus = 'responded' | 'pending'

export type BackgroundParameterKind = 'technical' | 'business'

export type BackgroundParameter = {
  id: string
  label: string
  title: string
  status: BackgroundParameterStatus
  /** 技术类 / 商务类，缺省为 technical */
  kind?: BackgroundParameterKind
  sourcePath?: string
}

/** /init 从招标/标书类文件识别的项目摘要（写入 background.json） */
export type BackgroundProjectInfo = {
  projectName?: string
  /** 项目编号 / 采购编号 */
  projectCode?: string
  /** 招商单位 / 采购人 / 招标人 */
  purchaser?: string
  projectAmount?: string
  /** 服务周期 / 工期 */
  servicePeriod?: string
  /** 投标截止时间 */
  bidDeadline?: string
  location?: string
  /** 资质、业绩等准入要求摘要 */
  qualification?: string
  /** 付款节点 */
  paymentTerms?: string
  /** 质保与售后 */
  warranty?: string
  extra?: string
}

export const PROJECT_INFO_KEYS: (keyof BackgroundProjectInfo)[] = [
  'projectName',
  'projectCode',
  'purchaser',
  'projectAmount',
  'servicePeriod',
  'bidDeadline',
  'location',
  'qualification',
  'paymentTerms',
  'warranty',
  'extra',
]

export const paramDedupeKey = (p: BackgroundParameter) => `${p.kind ?? 'technical'}:${p.id}`

export const hasBackgroundProjectInfo = (info?: BackgroundProjectInfo) =>
  PROJECT_INFO_KEYS.some((k) => info?.[k]?.trim())

export type BackgroundManifestCategory = {
  id: string
  label: string
  paths?: string[]
  globs?: string[]
}

export type BackgroundManifest = {
  version: number
  projectInfo?: BackgroundProjectInfo
  parameters?: BackgroundParameter[]
  categories: BackgroundManifestCategory[]
}

export const isAiContextAllowed = (fileName: string) => AI_CONTEXT_EXT.test(fileName)

export const parseBackgroundManifest = (
  raw: unknown,
): { ok: true; manifest: BackgroundManifest } | { ok: false; error: string } => {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'manifest 须为 JSON 对象' }
  const obj = raw as Record<string, unknown>
  if (obj.version !== 1) return { ok: false, error: 'manifest version 须为 1' }
  if (!Array.isArray(obj.categories)) return { ok: false, error: 'manifest 缺少 categories 数组' }

  let projectInfo: BackgroundProjectInfo | undefined
  if (obj.projectInfo != null) {
    if (typeof obj.projectInfo !== 'object') return { ok: false, error: 'projectInfo 须为对象' }
    const pi = obj.projectInfo as Record<string, unknown>
    const pick = (key: keyof BackgroundProjectInfo) => {
      const v = pi[key]
      return typeof v === 'string' && v.trim() ? v.trim() : undefined
    }
    projectInfo = Object.fromEntries(
      PROJECT_INFO_KEYS.map((key) => [key, pick(key)]).filter(([, v]) => v),
    ) as BackgroundProjectInfo
    if (!hasBackgroundProjectInfo(projectInfo)) projectInfo = undefined
  }

  const parameters: BackgroundParameter[] = []
  if (Array.isArray(obj.parameters)) {
    for (const item of obj.parameters) {
      if (!item || typeof item !== 'object') return { ok: false, error: 'parameters 项无效' }
      const p = item as Record<string, unknown>
      if (typeof p.id !== 'string' || !p.id.trim()) return { ok: false, error: 'parameter id 无效' }
      if (typeof p.label !== 'string' || !p.label.trim()) return { ok: false, error: 'parameter label 无效' }
      if (typeof p.title !== 'string') return { ok: false, error: 'parameter title 无效' }
      const status = p.status === 'responded' || p.status === 'pending' ? p.status : 'pending'
      const sourcePath = typeof p.sourcePath === 'string' ? p.sourcePath : undefined
      const kindRaw = p.kind
      const kind: BackgroundParameterKind | undefined =
        kindRaw === 'business' || kindRaw === 'technical' ? kindRaw : undefined
      parameters.push({
        id: p.id.trim(),
        label: p.label.trim(),
        title: p.title.trim(),
        status,
        ...(kind ? { kind } : {}),
        sourcePath,
      })
    }
  }

  const categories: BackgroundManifestCategory[] = []
  for (const item of obj.categories) {
    if (!item || typeof item !== 'object') return { ok: false, error: 'categories 项无效' }
    const c = item as Record<string, unknown>
    if (typeof c.id !== 'string' || !c.id.trim()) return { ok: false, error: 'category id 无效' }
    if (typeof c.label !== 'string' || !c.label.trim()) return { ok: false, error: 'category label 无效' }
    const paths = Array.isArray(c.paths) ? c.paths.filter((p): p is string => typeof p === 'string') : []
    const globs = Array.isArray(c.globs) ? c.globs.filter((g): g is string => typeof g === 'string') : []
    categories.push({ id: c.id.trim(), label: c.label.trim(), paths, globs })
  }

  return {
    ok: true,
    manifest: {
      version: 1,
      projectInfo,
      parameters: parameters.length ? parameters : undefined,
      categories,
    },
  }
}

export const dedupePaths = (paths: string[]) => {
  const seen = new Set<string>()
  const out: string[] = []
  for (const p of paths) {
    const key = p.replace(/\\/g, '/')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(p)
  }
  return out
}

export const resolveRelativePath = (projectRoot: string, rel: string): string | null => {
  const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const normalized = rel.replace(/\\/g, '/').replace(/^\.\//, '')
  if (normalized.includes('..')) return null
  const abs = `${root}/${normalized}`.replace(/\/+/g, '/')
  if (!abs.startsWith(root + '/') && abs !== root) return null
  return abs
}

export const backgroundIncludeStorageKey = (projectRoot: string) =>
  `writcraft.background.include.${projectRoot}`

/** 与 localStorage 合并；无历史记录时默认不勾选（不自动带入聊天） */
export const mergeIncludedWithDefaults = (stored: string[] | null, allAiPaths: string[]) => {
  if (!stored) return []
  const set = new Set(allAiPaths)
  return stored.filter((p) => set.has(p))
}

export const loadIncludedPathsFromStorage = (projectRoot: string): string[] | null => {
  try {
    const raw = localStorage.getItem(backgroundIncludeStorageKey(projectRoot))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((p): p is string => typeof p === 'string')
  } catch {
    return null
  }
}

export const saveIncludedPathsToStorage = (projectRoot: string, paths: string[]) => {
  try {
    localStorage.setItem(backgroundIncludeStorageKey(projectRoot), JSON.stringify(paths))
  } catch {
    /* ignore quota */
  }
}

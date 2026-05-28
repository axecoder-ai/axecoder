export const INIT_PROGRESS_LABELS = {
  scan: '正在列出项目文件…',
  inspect: '正在逐个查看文件…',
  aiExtract: '第1轮：大模型快速识别技术参数…',
  aiExtractFull: '第2轮：全文通读并提取技术参数…',
  mergeParams: '正在合并参数文档…',
  projectInfo: '正在识别项目名称、招商单位、项目金额…',
  checkResponse: '正在对照技术方案检测参数是否已响应…',
  writeManifest: '正在写入 background.json…',
  done: '扫描完成',
} as const

export type InitProgressStage = keyof typeof INIT_PROGRESS_LABELS

export type InitProgressStep = {
  id: InitProgressStage
  label: string
  status: 'active' | 'done' | 'error'
}

export type BackgroundInitProgressPayload =
  | { type: 'stage'; stage: InitProgressStage; status: 'start' | 'done' | 'error' }
  | { type: 'file'; relativePath: string; current: number; total: number }
  | {
      type: 'ai'
      phase: 'think' | 'act'
      relativePath: string
      text: string
      current: number
      total: number
      round?: 1 | 2
      chunk?: { index: number; total: number }
    }

export const labelForInitFile = (relativePath: string, current: number, total: number) =>
  `正在查看 (${current}/${total})：${relativePath}`

export const formatInitProgressLogLine = (payload: BackgroundInitProgressPayload): string => {
  if (payload.type === 'stage') {
    const label = INIT_PROGRESS_LABELS[payload.stage]
    if (payload.status === 'start') return `▶ ${label}`
    if (payload.status === 'error') return `✗ ${label}`
    return `✓ ${label}`
  }
  if (payload.type === 'file') {
    return `  · 查看 (${payload.current}/${payload.total}) ${payload.relativePath}`
  }
  if (payload.type === 'ai') {
    const tag = payload.phase === 'think' ? '思考' : '执行'
    const round = payload.round === 2 ? '第2轮' : '第1轮'
    const chunk =
      payload.chunk && payload.chunk.total > 1
        ? ` 段${payload.chunk.index}/${payload.chunk.total}`
        : ''
    const head = `${round}${chunk} [${payload.current}/${payload.total}] ${payload.relativePath}`
    const body = payload.text.replace(/\s+/g, ' ').slice(0, 240)
    return `  ${tag} ${head}：${body}`
  }
  return ''
}

export const advanceInitProgress = (
  steps: InitProgressStep[],
  payload: BackgroundInitProgressPayload,
): InitProgressStep[] => {
  const next = steps.map((s) => ({ ...s }))

  if (payload.type === 'ai') {
    const stageId = payload.round === 2 ? 'aiExtractFull' : 'aiExtract'
    for (const s of next) {
      if (s.status === 'active' && s.id !== stageId) s.status = 'done'
    }
    const tag = payload.phase === 'think' ? '思考' : '执行'
    const base = INIT_PROGRESS_LABELS[stageId]
    const label = `${base} [${payload.current}/${payload.total}] ${tag} · ${payload.relativePath}`
    const existing = next.find((s) => s.id === stageId)
    if (existing) {
      existing.status = 'active'
      existing.label = label
    } else {
      next.push({ id: stageId, label, status: 'active' })
    }
    return next
  }

  if (payload.type === 'file') {
    for (const s of next) {
      if (s.status === 'active') s.status = 'done'
    }
    const id = 'inspect' as InitProgressStage
    const label = labelForInitFile(payload.relativePath, payload.current, payload.total)
    const existing = next.find((s) => s.id === id)
    if (existing) {
      existing.status = 'active'
      existing.label = label
    } else {
      next.push({ id, label, status: 'active' })
    }
    return next
  }

  const label = INIT_PROGRESS_LABELS[payload.stage]

  if (payload.status === 'start') {
    for (const s of next) {
      if (s.status === 'active') s.status = 'done'
    }
    const existing = next.find((s) => s.id === payload.stage)
    if (existing) {
      existing.status = 'active'
      existing.label = label
    } else {
      next.push({ id: payload.stage, label, status: 'active' })
    }
    return next
  }

  const target = next.find((s) => s.id === payload.stage)
  if (target) {
    target.status = payload.status === 'error' ? 'error' : 'done'
    target.label = label
  }
  return next
}

/** @deprecated 兼容旧 payload 形状 */
export const normalizeInitProgressPayload = (
  payload: BackgroundInitProgressPayload | { stage: InitProgressStage; status: 'start' | 'done' | 'error' },
): BackgroundInitProgressPayload => {
  if ('type' in payload) return payload
  return { type: 'stage', stage: payload.stage, status: payload.status }
}

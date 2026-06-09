export type AiMetricsSource = 'chat' | 'agent' | 'workshop' | 'other'

export type AiMetricsTimeRange = 'session' | '1h'

export type AiMetricsFilter = {
  modelId?: string
  source?: AiMetricsSource
  provider?: string
  timeRange?: AiMetricsTimeRange
}

export type AiMetricsCallRecord = {
  id: string
  modelId: string
  modelName: string
  provider: string
  source: AiMetricsSource
  startedAt: number
  firstTokenAt: number | null
  endedAt: number
  ok: boolean
  error?: string
  outputChars: number
  inputTokens: number
  outputTokens: number
  tokensEstimated: boolean
}

export const SLO_TTFT_MS = 3000

export type AiMetricsSeriesPoint = {
  label: string
  ttftP50: number
  ttftP95: number
  e2eP95: number
  tps: number
  qps: number
  errorRate: number
  tokensPerMin: number
  inputTokens: number
  outputTokens: number
  cumulativeTokens: number
  okCount: number
  failCount: number
  sloBreach: boolean
}

export type AiMetricsSourceBreakdown = {
  source: AiMetricsSource
  calls: number
  tokens: number
}

export type AiMetricsHistogramBin = {
  label: string
  count: number
}

export type AiMetricsModelSummary = {
  modelId: string
  modelName: string
  provider: string
  primarySource: AiMetricsSource
  callCount: number
  ttftP95: number
  e2eP95: number
  tps: number
  errorRate: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  tokensEstimated: boolean
}

export type AiMetricsKpis = {
  ttftP50: number
  ttftP95: number
  e2eP95: number
  tps: number
  qps: number
  errorRate: number
  tokensPerMin: number
  totalCalls: number
  totalTokens: number
  inputTokens: number
  outputTokens: number
  tokensEstimated: boolean
}

export type AiMetricsBlock = {
  kpis: AiMetricsKpis
  models: AiMetricsModelSummary[]
}

export type AiMetricsActivityKind = 'model_call' | 'tool_call' | 'tool_result' | 'first_token'

export type AiMetricsActivityLine = {
  id: string
  ts: number
  kind: AiMetricsActivityKind
  ok?: boolean
  text: string
  modelId?: string
  source?: AiMetricsSource
}

export type AiMetricsSnapshot = {
  updatedAt: number
  concurrent: number
  providers: string[]
  sources: AiMetricsSource[]
  sloThresholdMs: number
  sourceBreakdown: AiMetricsSourceBreakdown[]
  inputTokenHistogram: AiMetricsHistogramBin[]
  realtime: AiMetricsBlock
  cumulative: AiMetricsBlock
  series: AiMetricsSeriesPoint[]
  activityLog: AiMetricsActivityLine[]
}

import { broadcastToRenderers } from './renderer-broadcast'

const MAX_RECORDS = 400
const MAX_ACTIVITY = 50
const SERIES_BUCKETS = 24
const BUCKET_MS = 2500
const HOUR_MS = 3600_000

let seq = 0
let activitySeq = 0
const active = new Map<
  string,
  { startedAt: number; firstTokenAt: number | null; modelName: string; modelId: string; source: AiMetricsSource }
>()
const records: AiMetricsCallRecord[] = []
const activityLines: AiMetricsActivityLine[] = []

const percentile = (values: number[], p: number): number => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]!
}

const estimateTokensFromChars = (chars: number) => Math.max(1, Math.round(chars / 4))

const callDurationMs = (r: AiMetricsCallRecord) => Math.max(1, r.endedAt - r.startedAt)

const ttftMs = (r: AiMetricsCallRecord) => {
  const end = r.firstTokenAt ?? r.endedAt
  return Math.max(0, end - r.startedAt)
}

const e2eMs = (r: AiMetricsCallRecord) => Math.max(0, r.endedAt - r.startedAt)

const recordTotalTokens = (r: AiMetricsCallRecord) => r.inputTokens + r.outputTokens

const activeDurationMs = (list: AiMetricsCallRecord[]) =>
  list.reduce((sum, r) => sum + callDurationMs(r), 0)

const genId = () => `m-${Date.now()}-${++seq}`

const normalizeFilter = (filter?: AiMetricsFilter | string): AiMetricsFilter => {
  if (typeof filter === 'string') {
    const id = filter.trim()
    return id ? { modelId: id } : {}
  }
  return filter ?? {}
}

const applyFilter = (list: AiMetricsCallRecord[], filter?: AiMetricsFilter | string, now = Date.now()) => {
  const f = normalizeFilter(filter)
  let out = list
  if (f.modelId) out = out.filter((r) => r.modelId === f.modelId)
  if (f.source) out = out.filter((r) => r.source === f.source)
  if (f.provider) out = out.filter((r) => r.provider === f.provider)
  if (f.timeRange === '1h') out = out.filter((r) => r.endedAt >= now - HOUR_MS)
  return out
}

export const pushAiMetricsActivity = (line: Omit<AiMetricsActivityLine, 'id' | 'ts'>) => {
  const row: AiMetricsActivityLine = { id: `act-${Date.now()}-${++activitySeq}`, ts: Date.now(), ...line }
  activityLines.push(row)
  if (activityLines.length > MAX_ACTIVITY) activityLines.splice(0, activityLines.length - MAX_ACTIVITY)
  broadcastToRenderers('aiMetrics:activity', getAiMetricsActivityLog())
}

export const getAiMetricsActivityLog = (): AiMetricsActivityLine[] => [...activityLines]

export const beginAiMetricsCall = (input: {
  modelId: string
  modelName: string
  provider: string
  source: AiMetricsSource
}): string => {
  const id = genId()
  active.set(id, {
    startedAt: Date.now(),
    firstTokenAt: null,
    modelName: input.modelName,
    modelId: input.modelId,
    source: input.source,
  })
  return id
}

export const markAiMetricsFirstToken = (callId: string) => {
  const row = active.get(callId)
  if (!row || row.firstTokenAt !== null) return
  row.firstTokenAt = Date.now()
  pushAiMetricsActivity({
    kind: 'first_token',
    text: `${row.modelName} · TTFT ${row.firstTokenAt - row.startedAt}ms`,
    modelId: row.modelId,
    source: row.source,
  })
}

export const endAiMetricsCall = (
  callId: string,
  input: {
    ok: boolean
    error?: string
    outputChars?: number
    inputTokens?: number
    outputTokens?: number
    tokensEstimated?: boolean
  },
  meta: {
    modelId: string
    modelName: string
    provider: string
    source: AiMetricsSource
  },
) => {
  const row = active.get(callId)
  if (!row) return
  active.delete(callId)
  const endedAt = Date.now()
  const outChars = input.outputChars ?? 0
  const outputTokens = input.outputTokens ?? estimateTokensFromChars(outChars)
  const inputTokens = input.inputTokens ?? 0
  const tokensEstimated =
    input.tokensEstimated ?? (input.inputTokens === undefined && input.outputTokens === undefined)
  const rec: AiMetricsCallRecord = {
    id: callId,
    modelId: meta.modelId,
    modelName: meta.modelName,
    provider: meta.provider,
    source: meta.source,
    startedAt: row.startedAt,
    firstTokenAt: row.firstTokenAt,
    endedAt,
    ok: input.ok,
    error: input.error,
    outputChars: outChars,
    inputTokens,
    outputTokens,
    tokensEstimated,
  }
  records.push(rec)
  if (records.length > MAX_RECORDS) records.splice(0, records.length - MAX_RECORDS)
}

export const resetAiMetricsStore = () => {
  active.clear()
  records.length = 0
  activityLines.length = 0
}

const buildKpis = (
  list: AiMetricsCallRecord[],
  mode: 'realtime' | 'cumulative',
  windowSec: number,
): AiMetricsKpis => {
  const ttfts = list.map(ttftMs)
  const e2es = list.map(e2eMs)
  const durations = list.map(callDurationMs)
  const tpsVals = list.map((r, idx) => r.outputTokens / (durations[idx]! / 1000))
  const errors = list.filter((r) => !r.ok).length
  const inputTokens = list.reduce((sum, r) => sum + r.inputTokens, 0)
  const outputTokens = list.reduce((sum, r) => sum + r.outputTokens, 0)
  const totalTokens = inputTokens + outputTokens
  const anyEstimated = list.some((r) => r.tokensEstimated)

  let qps = 0
  let tokensPerMin = 0
  if (mode === 'realtime') {
    qps = windowSec > 0 ? list.length / windowSec : 0
    tokensPerMin = windowSec > 0 ? (totalTokens / windowSec) * 60 : 0
  } else {
    const activeMs = activeDurationMs(list)
    const activeSec = activeMs / 1000
    qps = activeSec > 0 ? list.length / activeSec : 0
    tokensPerMin = activeSec > 0 ? (totalTokens / activeSec) * 60 : 0
  }

  return {
    ttftP50: percentile(ttfts, 50),
    ttftP95: percentile(ttfts, 95),
    e2eP95: percentile(e2es, 95),
    tps: tpsVals.length ? tpsVals.reduce((a, b) => a + b, 0) / tpsVals.length : 0,
    qps,
    errorRate: list.length ? (errors / list.length) * 100 : 0,
    tokensPerMin,
    totalCalls: list.length,
    totalTokens,
    inputTokens,
    outputTokens,
    tokensEstimated: anyEstimated,
  }
}

const emptySeriesPoint = (label: string, cumulativeTokens: number): AiMetricsSeriesPoint => ({
  label,
  ttftP50: 0,
  ttftP95: 0,
  e2eP95: 0,
  tps: 0,
  qps: 0,
  errorRate: 0,
  tokensPerMin: 0,
  inputTokens: 0,
  outputTokens: 0,
  cumulativeTokens,
  okCount: 0,
  failCount: 0,
  sloBreach: false,
})

const buildSeries = (list: AiMetricsCallRecord[], now: number): AiMetricsSeriesPoint[] => {
  const out: AiMetricsSeriesPoint[] = []
  const bucketSec = BUCKET_MS / 1000
  let runCumulative = 0
  for (let i = SERIES_BUCKETS - 1; i >= 0; i--) {
    const bucketEnd = now - i * BUCKET_MS
    const bucketStart = bucketEnd - BUCKET_MS
    const inBucket = list.filter((r) => r.endedAt > bucketStart && r.endedAt <= bucketEnd)
    const d = new Date(bucketEnd)
    const label = d.toLocaleTimeString('zh-CN', { hour12: false, minute: '2-digit', second: '2-digit' })
    if (!inBucket.length) {
      out.push(emptySeriesPoint(label, runCumulative))
      continue
    }

    const ttfts = inBucket.map(ttftMs)
    const e2es = inBucket.map(e2eMs)
    const durations = inBucket.map(callDurationMs)
    const tpsVals = inBucket.map((r, idx) => r.outputTokens / (durations[idx]! / 1000))
    const errors = inBucket.filter((r) => !r.ok).length
    const inputTokens = inBucket.reduce((sum, r) => sum + r.inputTokens, 0)
    const outputTokens = inBucket.reduce((sum, r) => sum + r.outputTokens, 0)
    const tokens = inputTokens + outputTokens
    runCumulative += tokens
    const ttftP95 = percentile(ttfts, 95)
    out.push({
      label,
      ttftP50: percentile(ttfts, 50),
      ttftP95,
      e2eP95: percentile(e2es, 95),
      tps: tpsVals.reduce((a, b) => a + b, 0) / tpsVals.length,
      qps: inBucket.length / bucketSec,
      errorRate: (errors / inBucket.length) * 100,
      tokensPerMin: (tokens / bucketSec) * 60,
      inputTokens,
      outputTokens,
      cumulativeTokens: runCumulative,
      okCount: inBucket.length - errors,
      failCount: errors,
      sloBreach: ttftP95 > SLO_TTFT_MS,
    })
  }
  return out
}

const buildSourceBreakdown = (list: AiMetricsCallRecord[]): AiMetricsSourceBreakdown[] => {
  const bySource = new Map<AiMetricsSource, { calls: number; tokens: number }>()
  for (const r of list) {
    const row = bySource.get(r.source) ?? { calls: 0, tokens: 0 }
    row.calls += 1
    row.tokens += recordTotalTokens(r)
    bySource.set(r.source, row)
  }
  return [...bySource.entries()]
    .map(([source, row]) => ({ source, calls: row.calls, tokens: row.tokens }))
    .sort((a, b) => b.calls - a.calls)
}

const INPUT_HIST_BINS = [
  { label: '0-1k', min: 0, max: 1000 },
  { label: '1k-4k', min: 1000, max: 4000 },
  { label: '4k-16k', min: 4000, max: 16000 },
  { label: '16k+', min: 16000, max: Infinity },
] as const

const buildInputTokenHistogram = (list: AiMetricsCallRecord[]): AiMetricsHistogramBin[] =>
  INPUT_HIST_BINS.map((bin) => ({
    label: bin.label,
    count: list.filter((r) => r.inputTokens >= bin.min && r.inputTokens < bin.max).length,
  }))

const dominantSource = (rows: AiMetricsCallRecord[]): AiMetricsSource => {
  const counts = new Map<AiMetricsSource, number>()
  for (const r of rows) counts.set(r.source, (counts.get(r.source) ?? 0) + 1)
  let best: AiMetricsSource = rows[0]?.source ?? 'other'
  let bestN = 0
  for (const [src, n] of counts) {
    if (n > bestN) {
      best = src
      bestN = n
    }
  }
  return best
}

const buildModelSummaries = (list: AiMetricsCallRecord[]): AiMetricsModelSummary[] => {
  const byId = new Map<string, AiMetricsCallRecord[]>()
  for (const r of list) {
    const arr = byId.get(r.modelId) ?? []
    arr.push(r)
    byId.set(r.modelId, arr)
  }
  const summaries: AiMetricsModelSummary[] = []
  for (const [modelId, rows] of byId) {
    const ttfts = rows.map(ttftMs)
    const e2es = rows.map(e2eMs)
    const durations = rows.map(callDurationMs)
    const tpsVals = rows.map((r, idx) => r.outputTokens / (durations[idx]! / 1000))
    const errors = rows.filter((r) => !r.ok).length
    const inputTokens = rows.reduce((sum, r) => sum + r.inputTokens, 0)
    const outputTokens = rows.reduce((sum, r) => sum + r.outputTokens, 0)
    summaries.push({
      modelId,
      modelName: rows[0]?.modelName ?? modelId,
      provider: rows[0]?.provider ?? '',
      primarySource: dominantSource(rows),
      callCount: rows.length,
      ttftP95: percentile(ttfts, 95),
      e2eP95: percentile(e2es, 95),
      tps: tpsVals.length ? tpsVals.reduce((a, b) => a + b, 0) / tpsVals.length : 0,
      errorRate: rows.length ? (errors / rows.length) * 100 : 0,
      totalTokens: inputTokens + outputTokens,
      inputTokens,
      outputTokens,
      tokensEstimated: rows.some((r) => r.tokensEstimated),
    })
  }
  return summaries.sort((a, b) => b.callCount - a.callCount)
}

const collectMetaLists = (list: AiMetricsCallRecord[]) => ({
  providers: [...new Set(list.map((r) => r.provider).filter(Boolean))].sort(),
  sources: [...new Set(list.map((r) => r.source))].sort(),
})

export const getAiMetricsSnapshot = (filter?: AiMetricsFilter | string): AiMetricsSnapshot => {
  const now = Date.now()
  const windowMs = SERIES_BUCKETS * BUCKET_MS
  const windowSec = windowMs / 1000
  const f = normalizeFilter(filter)
  const allRecords = applyFilter(records, f, now)
  const realtimeList = allRecords.filter((r) => r.endedAt >= now - windowMs)
  const cumulativeList = allRecords

  const allInWindow = applyFilter(
    records.filter((r) => r.endedAt >= now - windowMs),
    { ...f, timeRange: undefined },
    now,
  )
  const modelsRealtime = buildModelSummaries(f.modelId ? realtimeList : allInWindow)
  const modelsCumulative = buildModelSummaries(cumulativeList)
  const meta = collectMetaLists(records)

  const realtimeKpis = buildKpis(realtimeList, 'realtime', windowSec)
  // 无进行中的调用时，实时 TPS 归零（时速表语义）
  if (active.size === 0) realtimeKpis.tps = 0

  return {
    updatedAt: now,
    concurrent: active.size,
    providers: meta.providers,
    sources: meta.sources,
    sloThresholdMs: SLO_TTFT_MS,
    sourceBreakdown: buildSourceBreakdown(cumulativeList),
    inputTokenHistogram: buildInputTokenHistogram(cumulativeList),
    realtime: {
      kpis: realtimeKpis,
      models: modelsRealtime,
    },
    cumulative: {
      kpis: buildKpis(cumulativeList, 'cumulative', windowSec),
      models: modelsCumulative,
    },
    series: buildSeries(realtimeList, now),
    activityLog: getAiMetricsActivityLog(),
  }
}

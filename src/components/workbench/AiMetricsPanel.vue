<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from '../../i18n'
import type {
  AiMetricsActivityLine,
  AiMetricsFilter,
  AiMetricsSnapshot,
  AiMetricsSource,
  AppTheme,
} from '../../types/axecoder'
import {
  applyMetricsWindowTheme,
  getMetricsWindowThemeMode,
  setMetricsWindowThemeMode,
  type MetricsWindowThemeMode,
} from '../../utils/metrics-window-theme'

const props = defineProps<{
  expanded?: boolean
  detached?: boolean
  globalTheme?: AppTheme
}>()

const emit = defineEmits<{
  detach: []
  openTrace: [modelId: string]
}>()

const { t } = useI18n()

const snapshot = ref<AiMetricsSnapshot | null>(null)
const filterModelId = ref('')
const filterSource = ref<AiMetricsSource | ''>('')
const filterProvider = ref('')
const filterTimeRange = ref<'session' | '1h'>('session')
const themeMode = ref<MetricsWindowThemeMode>(getMetricsWindowThemeMode())
const chartTtft = ref<HTMLCanvasElement | null>(null)
const chartTps = ref<HTMLCanvasElement | null>(null)
const chartErr = ref<HTMLCanvasElement | null>(null)
const chartE2e = ref<HTMLCanvasElement | null>(null)
const chartTpsGauge = ref<HTMLCanvasElement | null>(null)
const chartsEl = ref<HTMLElement | null>(null)
const activityLogEl = ref<HTMLElement | null>(null)
const activityLog = ref<AiMetricsActivityLine[]>([])

let offMetrics: (() => void) | undefined
let offActivity: (() => void) | undefined
let themeObs: MutationObserver | undefined
let chartsResizeObs: ResizeObserver | undefined
let gaugeRaf = 0
let gaugeNeedleTps = 0
let gaugeLastFrame = 0

const buildFilter = (): AiMetricsFilter | undefined => {
  const f: AiMetricsFilter = {}
  if (filterModelId.value) f.modelId = filterModelId.value
  if (filterSource.value) f.source = filterSource.value
  if (filterProvider.value) f.provider = filterProvider.value
  if (filterTimeRange.value === '1h') f.timeRange = '1h'
  return Object.keys(f).length ? f : undefined
}

const needsRefetch = () =>
  !!filterModelId.value || !!filterSource.value || !!filterProvider.value || filterTimeRange.value === '1h'

const sourceLabel = (s: AiMetricsSource) => {
  if (s === 'chat') return t('metrics.sourceChat')
  if (s === 'agent') return t('metrics.sourceAgent')
  if (s === 'workshop') return t('metrics.sourceWorkshop')
  return t('metrics.sourceOther')
}

const modelOptions = computed(() => {
  const models = snapshot.value?.cumulative.models ?? []
  return [{ id: '', name: t('metrics.allModels') }, ...models.map((m) => ({ id: m.modelId, name: m.modelName }))]
})

const sourceOptions = computed(() => {
  const sources = snapshot.value?.sources ?? []
  return [{ id: '' as const, name: t('metrics.allSources') }, ...sources.map((s) => ({ id: s, name: sourceLabel(s) }))]
})

const providerOptions = computed(() => {
  const providers = snapshot.value?.providers ?? []
  return [{ id: '', name: t('metrics.allProviders') }, ...providers.map((p) => ({ id: p, name: p }))]
})

const mergedModelRows = computed(() => {
  const rtMap = new Map((snapshot.value?.realtime.models ?? []).map((m) => [m.modelId, m]))
  const cumMap = new Map((snapshot.value?.cumulative.models ?? []).map((m) => [m.modelId, m]))
  const ids = [...new Set([...rtMap.keys(), ...cumMap.keys()])]
  return ids
    .map((id) => {
      const cum = cumMap.get(id)
      const rt = rtMap.get(id)
      return {
        modelId: id,
        modelName: cum?.modelName ?? rt?.modelName ?? id,
        provider: cum?.provider ?? rt?.provider ?? '',
        callCount: cum?.callCount ?? 0,
        rtTtft: rt?.ttftP95 ?? 0,
        rtTps: rt?.tps ?? 0,
        cumTtft: cum?.ttftP95 ?? 0,
        cumE2e: cum?.e2eP95 ?? 0,
        cumTps: cum?.tps ?? 0,
        errorRate: cum?.errorRate ?? 0,
        totalTokens: cum?.totalTokens ?? 0,
        tokensEstimated: cum?.tokensEstimated ?? false,
      }
    })
    .sort((a, b) => b.callCount - a.callCount)
})

const loadSnapshot = async () => {
  snapshot.value = await window.axecoder.getAiMetricsSnapshot(buildFilter())
  activityLog.value = snapshot.value?.activityLog ?? []
  await nextTick()
  redrawCharts()
  scrollActivityToBottom()
}

const seriesHasActivity = (pts: AiMetricsSnapshot['series']) =>
  pts.some(
    (p) =>
      p.ttftP50 > 0 ||
      p.ttftP95 > 0 ||
      p.e2eP95 > 0 ||
      p.tps > 0 ||
      p.qps > 0 ||
      p.errorRate > 0 ||
      p.failCount > 0 ||
      p.tokensPerMin > 0 ||
      p.inputTokens > 0 ||
      p.cumulativeTokens > 0 ||
      p.okCount > 0,
  )

const chartUiColors = () => {
  const s = getComputedStyle(document.documentElement)
  return {
    muted: s.getPropertyValue('--wc-text-muted').trim() || '#969696',
    text: s.getPropertyValue('--wc-text').trim() || '#cccccc',
    grid: s.getPropertyValue('--wc-muted-border').trim() || 'rgba(128,128,128,0.2)',
  }
}

const chartCanvasSize = (parent: HTMLElement) => {
  const rect = parent.getBoundingClientRect()
  const w = Math.floor(rect.width)
  const h = Math.floor(rect.height)
  if (w < 8 || h < 8) return null
  return { w, h }
}

const drawLineChart = (
  canvas: HTMLCanvasElement | null,
  series: { values: number[]; color: string; label: string; markSlo?: boolean }[],
  hasActivity: boolean,
  large: boolean,
  ui: ReturnType<typeof chartUiColors>,
  sloThreshold?: number,
) => {
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  const size = chartCanvasSize(parent)
  if (!size) return
  const { w, h } = size
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const pad = { l: 40, r: large ? 72 : 8, t: 10, b: 20 }
  const plotW = w - pad.l - pad.r
  const plotH = h - pad.t - pad.b
  const allVals = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v))
  const maxV = allVals.length ? Math.max(...allVals, 1) : 1
  const minV = 0
  const range = maxV - minV || 1
  const n = series[0]?.values.length ?? 0
  if (!hasActivity || n < 1) {
    ctx.fillStyle = ui.muted
    ctx.font = `${large ? 12 : 11}px sans-serif`
    ctx.fillText(t('metrics.noData'), pad.l, pad.t + 22)
    return
  }

  ctx.strokeStyle = ui.grid
  ctx.lineWidth = 1
  for (let i = 0; i <= 3; i++) {
    const y = pad.t + (plotH * i) / 3
    ctx.beginPath()
    ctx.moveTo(pad.l, y)
    ctx.lineTo(pad.l + plotW, y)
    ctx.stroke()
  }

  if (sloThreshold && sloThreshold > 0 && sloThreshold <= maxV) {
    const sy = pad.t + plotH - ((sloThreshold - minV) / range) * plotH
    ctx.strokeStyle = '#ef4444'
    ctx.setLineDash([5, 4])
    ctx.beginPath()
    ctx.moveTo(pad.l, sy)
    ctx.lineTo(pad.l + plotW, sy)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = '#ef4444'
    ctx.font = '9px sans-serif'
    ctx.fillText(`${t('metrics.sloLine')} ${sloThreshold}ms`, pad.l + 2, sy - 3)
  }

  const lineW = large ? 2.5 : 1.8
  for (const s of series) {
    ctx.strokeStyle = s.color
    ctx.lineWidth = lineW
    if (n === 1) {
      const x = pad.l + plotW / 2
      const y = pad.t + plotH - ((s.values[0]! - minV) / range) * plotH
      ctx.beginPath()
      ctx.arc(x, y, large ? 4 : 3, 0, Math.PI * 2)
      ctx.fillStyle = s.color
      ctx.fill()
      continue
    }
    ctx.beginPath()
    s.values.forEach((v, i) => {
      const x = pad.l + (plotW * i) / (n - 1)
      const y = pad.t + plotH - ((v - minV) / range) * plotH
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    if (s.markSlo && sloThreshold && n > 1) {
      s.values.forEach((v, i) => {
        if (v <= sloThreshold) return
        const x = pad.l + (plotW * i) / (n - 1)
        const y = pad.t + plotH - ((v - minV) / range) * plotH
        ctx.beginPath()
        ctx.arc(x, y, large ? 4 : 3, 0, Math.PI * 2)
        ctx.fillStyle = '#ef4444'
        ctx.fill()
      })
    }
  }

  ctx.fillStyle = ui.muted
  ctx.font = `${large ? 11 : 10}px sans-serif`
  ctx.fillText(maxV.toFixed(maxV >= 100 ? 0 : 1), 4, pad.t + 10)
  ctx.fillText('0', 4, pad.t + plotH)

  let lx = w - pad.r + 6
  let ly = pad.t + 6
  ctx.font = `${large ? 11 : 10}px sans-serif`
  for (const s of series) {
    ctx.fillStyle = s.color
    ctx.fillRect(lx, ly - 8, 10, 3)
    ctx.fillStyle = ui.text
    ctx.fillText(s.label, lx + 14, ly)
    ly += large ? 16 : 14
  }
}

const drawErrorRatePie = (
  canvas: HTMLCanvasElement | null,
  errorRate: number,
  totalCalls: number,
  large: boolean,
  ui: ReturnType<typeof chartUiColors>,
) => {
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  const size = chartCanvasSize(parent)
  if (!size) return
  const { w, h } = size
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  if (totalCalls <= 0) {
    ctx.fillStyle = ui.muted
    ctx.font = `${large ? 12 : 11}px sans-serif`
    ctx.fillText(t('metrics.noData'), 8, 22)
    return
  }

  const errPct = Math.max(0, Math.min(100, errorRate))
  const okPct = 100 - errPct
  const cx = w / 2
  const cy = h - (large ? 14 : 10)
  const r = Math.min(w / 2 - 16, h - (large ? 38 : 32))
  const startA = Math.PI
  const errSweep = (errPct / 100) * Math.PI

  const drawWedge = (from: number, to: number, color: string) => {
    if (to <= from) return
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, r, from, to)
    ctx.closePath()
    ctx.fill()
  }

  if (errPct >= 100) {
    drawWedge(startA, 0, '#ef4444')
  } else if (errPct <= 0) {
    drawWedge(startA, 0, '#22c55e')
  } else {
    drawWedge(startA + errSweep, 0, '#22c55e')
    drawWedge(startA, startA + errSweep, '#ef4444')
  }

  ctx.strokeStyle = ui.grid
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, r, startA, 0)
  ctx.stroke()

  const labelY = cy - r / 2 - (large ? 4 : 2)
  ctx.fillStyle = ui.text
  ctx.font = `bold ${large ? 18 : 15}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${errPct.toFixed(1)}%`, cx, labelY)
  ctx.fillStyle = ui.muted
  ctx.font = `${large ? 10 : 9}px sans-serif`
  ctx.fillText(t('metrics.errorRate'), cx, labelY + (large ? 16 : 14))

  const items = [
    { color: '#ef4444', label: t('metrics.errorRate'), pct: errPct },
    { color: '#22c55e', label: t('metrics.successRate'), pct: okPct },
  ]
  ctx.font = `${large ? 11 : 10}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  let ly = cy + (large ? 10 : 8)
  for (const item of items) {
    const text = `${item.label} ${item.pct.toFixed(1)}%`
    const tw = ctx.measureText(text).width
    const boxW = tw + 18
    const lx = cx - boxW / 2
    ctx.fillStyle = item.color
    ctx.fillRect(lx, ly - 5, 10, 10)
    ctx.fillStyle = ui.text
    ctx.fillText(text, lx + 14 + tw / 2, ly)
    ly += large ? 15 : 13
  }
}

const TPS_GAUGE_MAX = 120

const drawTpsGauge = (
  canvas: HTMLCanvasElement | null,
  needleTps: number,
  labelTps: number,
  large: boolean,
  ui: ReturnType<typeof chartUiColors>,
) => {
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  const size = chartCanvasSize(parent)
  if (!size) return
  const { w, h } = size
  const dpr = window.devicePixelRatio || 1
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const maxTps = TPS_GAUGE_MAX
  const cx = w / 2
  const cy = h - (large ? 14 : 10)
  const r = Math.min(w / 2 - 16, h - (large ? 30 : 24))
  const startA = Math.PI
  const endA = 0
  const arcW = large ? 12 : 10
  const needleClamped = Math.max(0, Math.min(needleTps, maxTps))
  const labelClamped = Math.max(0, Math.min(labelTps, maxTps))
  // 上半圆：0 在左 (π)，120 在右 (0)，经顶部 (3π/2)
  const valToAngle = (v: number) => Math.PI + (v / maxTps) * Math.PI
  const needleA = valToAngle(needleClamped)

  // 彩色轨道：左 0 绿 → 中 60–90 黄 → 右 120 红（填充色带，沿上半圆逆时针）
  const fillGaugeZone = (fromV: number, toV: number, color: string) => {
    const a0 = valToAngle(fromV)
    const a1 = valToAngle(toV)
    const ro = r + arcW / 2
    const ri = Math.max(2, r - arcW / 2)
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(cx, cy, ro, a0, a1, true)
    ctx.arc(cx, cy, ri, a1, a0, false)
    ctx.closePath()
    ctx.fill()
  }
  fillGaugeZone(0, 60, '#22c55e')
  fillGaugeZone(60, 90, '#eab308')
  fillGaugeZone(90, 120, '#ef4444')
  ctx.strokeStyle = 'rgba(0,0,0,0.25)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.arc(cx, cy, r + arcW / 2, startA, endA, true)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(cx, cy, r - arcW / 2, startA, endA, true)
  ctx.stroke()

  // 刻度：每 10 一小格，每 20 大格 + 数字
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (let v = 0; v <= maxTps; v += 10) {
    const a = valToAngle(v)
    const major = v % 20 === 0
    const tickOut = r + (major ? (large ? 6 : 5) : (large ? 3 : 2))
    const tickIn = r - (major ? (large ? 16 : 13) : (large ? 10 : 8))
    ctx.strokeStyle = major ? ui.text : ui.muted
    ctx.lineWidth = major ? 2 : 1
    ctx.beginPath()
    ctx.moveTo(cx + Math.cos(a) * tickIn, cy + Math.sin(a) * tickIn)
    ctx.lineTo(cx + Math.cos(a) * tickOut, cy + Math.sin(a) * tickOut)
    ctx.stroke()
    if (major) {
      const labelR = r - (large ? 26 : 22)
      ctx.fillStyle = ui.muted
      ctx.font = `${large ? 10 : 9}px sans-serif`
      ctx.fillText(String(v), cx + Math.cos(a) * labelR, cy + Math.sin(a) * labelR)
    }
  }

  // 指针
  const needleLen = r - (large ? 20 : 16)
  const nx = cx + Math.cos(needleA) * needleLen
  const ny = cy + Math.sin(needleA) * needleLen
  const needleColor = labelClamped < 60 ? '#22c55e' : labelClamped < 90 ? '#eab308' : '#ef4444'
  ctx.strokeStyle = needleColor
  ctx.lineWidth = large ? 3 : 2.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(cx, cy)
  ctx.lineTo(nx, ny)
  ctx.stroke()

  ctx.fillStyle = ui.text
  ctx.beginPath()
  ctx.arc(cx, cy, large ? 5 : 4, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = needleColor
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = ui.text
  ctx.font = `bold ${large ? 20 : 16}px sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(Number.isFinite(labelTps) ? labelClamped.toFixed(1) : '—', cx, cy - (large ? 36 : 30))
  ctx.fillStyle = ui.muted
  ctx.font = `${large ? 11 : 10}px sans-serif`
  ctx.fillText('tok/s', cx, cy - (large ? 16 : 12))
}

const gaugeTargetTps = () => snapshot.value?.realtime.kpis.tps ?? 0

const tickGauge = (now: number) => {
  const dt = Math.min(48, now - gaugeLastFrame || now)
  gaugeLastFrame = now
  const target = gaugeTargetTps()
  const rising = target > gaugeNeedleTps
  const tauMs = rising ? 520 : target === 0 ? 680 : 420
  const alpha = 1 - Math.exp(-dt / tauMs)
  gaugeNeedleTps += (target - gaugeNeedleTps) * alpha
  if (Math.abs(target - gaugeNeedleTps) < 0.08) gaugeNeedleTps = target

  const sec = now / 1000
  const moving = Math.abs(target - gaugeNeedleTps) > 0.5
  const active = target > 0 || gaugeNeedleTps > 0.5 || moving
  const shakeAmp = active
    ? 0.08 + Math.min(1.0, gaugeNeedleTps * 0.012) + (moving ? 0.2 : 0)
    : 0.04
  const jitter =
    Math.sin(sec * 48) * shakeAmp * 0.55 +
    Math.sin(sec * 72 + 1.7) * shakeAmp * 0.35 +
    Math.sin(sec * 96 + 0.4) * shakeAmp * 0.2
  const needleDraw = Math.max(0, Math.min(TPS_GAUGE_MAX, gaugeNeedleTps + jitter))

  const large = !!props.expanded
  drawTpsGauge(chartTpsGauge.value, needleDraw, gaugeNeedleTps, large, chartUiColors())
  gaugeRaf = requestAnimationFrame(tickGauge)
}

const startGaugeLoop = () => {
  if (gaugeRaf) return
  gaugeLastFrame = performance.now()
  gaugeRaf = requestAnimationFrame(tickGauge)
}

const stopGaugeLoop = () => {
  if (gaugeRaf) cancelAnimationFrame(gaugeRaf)
  gaugeRaf = 0
}

const redrawCharts = () => {
  const pts = snapshot.value?.series ?? []
  const large = !!props.expanded
  const ui = chartUiColors()
  const hasActivity =
    seriesHasActivity(pts) ||
    (snapshot.value?.concurrent ?? 0) > 0 ||
    (snapshot.value?.realtime.kpis.totalCalls ?? 0) > 0
  const slo = snapshot.value?.sloThresholdMs ?? 3000

  drawLineChart(
    chartTtft.value,
    [
      { label: 'P50', color: '#38bdf8', values: pts.map((p) => p.ttftP50) },
      { label: 'P95', color: '#f59e0b', values: pts.map((p) => p.ttftP95), markSlo: true },
    ],
    hasActivity,
    large,
    ui,
    slo,
  )
  drawLineChart(
    chartTps.value,
    [
      { label: 'TPS', color: '#22c55e', values: pts.map((p) => p.tps) },
      { label: 'QPS', color: '#a78bfa', values: pts.map((p) => p.qps) },
    ],
    hasActivity,
    large,
    ui,
  )
  drawErrorRatePie(
    chartErr.value,
    snapshot.value?.cumulative.kpis.errorRate ?? 0,
    snapshot.value?.cumulative.kpis.totalCalls ?? 0,
    large,
    ui,
  )
  drawLineChart(
    chartE2e.value,
    [{ label: 'E2E P95', color: '#8b5cf6', values: pts.map((p) => p.e2eP95) }],
    hasActivity,
    large,
    ui,
  )
}

const fmt = (v: number, digits = 1) => (Number.isFinite(v) ? v.toFixed(digits) : '—')

const activityKindLabel = (kind: AiMetricsActivityLine['kind']) => {
  if (kind === 'model_call') return t('trace.kindModel')
  if (kind === 'tool_call') return t('trace.kindToolCall')
  if (kind === 'tool_result') return t('trace.kindToolResult')
  return t('metrics.kindFirstToken')
}

const fmtActivityTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  })

const ACTIVITY_MAX_LINES = 50

const filteredActivityLog = computed(() => {
  let rows = activityLog.value
  if (filterModelId.value) rows = rows.filter((r) => r.modelId === filterModelId.value)
  if (filterSource.value) rows = rows.filter((r) => !r.source || r.source === filterSource.value)
  return rows.slice(-ACTIVITY_MAX_LINES)
})

const scrollActivityToBottom = () => {
  const el = activityLogEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

const onDetach = () => {
  emit('detach')
  void window.axecoder.openMetricsWindow()
}

const onOpenTrace = (modelId: string) => {
  emit('openTrace', modelId)
}

const syncDetachedTheme = () => {
  if (!props.detached) return
  const global = props.globalTheme ?? 'vscode'
  const effective = applyMetricsWindowTheme(global)
  void window.axecoder.setWindowBackgroundTheme(effective)
  void nextTick().then(redrawCharts)
}

watch(themeMode, (mode) => {
  setMetricsWindowThemeMode(mode)
  syncDetachedTheme()
})

watch(
  () => props.globalTheme,
  () => {
    if (props.detached && themeMode.value === 'follow') syncDetachedTheme()
  },
)

watch([filterModelId, filterSource, filterProvider, filterTimeRange], () => {
  void loadSnapshot()
})

watch(
  () => filteredActivityLog.value.at(-1)?.id,
  () => {
    scrollActivityToBottom()
  },
  { flush: 'post' },
)

onMounted(async () => {
  if (props.detached) syncDetachedTheme()
  await loadSnapshot()
  offMetrics = window.axecoder.onAiMetricsUpdate((snap) => {
    if (needsRefetch()) {
      void window.axecoder.getAiMetricsSnapshot(buildFilter()).then((s) => {
        snapshot.value = s
        activityLog.value = s.activityLog ?? []
        void nextTick().then(redrawCharts)
      })
    } else {
      snapshot.value = snap
      activityLog.value = snap.activityLog ?? []
      void nextTick().then(redrawCharts)
    }
  })
  offActivity = window.axecoder.onAiMetricsActivity((lines) => {
    activityLog.value = lines
  })
  window.addEventListener('resize', redrawCharts)
  themeObs = new MutationObserver(() => {
    void nextTick().then(redrawCharts)
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  chartsResizeObs = new ResizeObserver(() => {
    void nextTick().then(redrawCharts)
  })
  if (chartsEl.value) chartsResizeObs.observe(chartsEl.value)
  startGaugeLoop()
})

onUnmounted(() => {
  offMetrics?.()
  offActivity?.()
  themeObs?.disconnect()
  chartsResizeObs?.disconnect()
  window.removeEventListener('resize', redrawCharts)
  stopGaugeLoop()
})
</script>

<template>
  <div class="metrics-root" :class="{ expanded }">
    <div class="metrics-toolbar">
      <label class="filter-field">
        <span>{{ t('metrics.modelFilter') }}</span>
        <select v-model="filterModelId">
          <option v-for="opt in modelOptions" :key="opt.id || '__all'" :value="opt.id">{{ opt.name }}</option>
        </select>
      </label>
      <label class="filter-field">
        <span>{{ t('metrics.sourceFilter') }}</span>
        <select v-model="filterSource">
          <option v-for="opt in sourceOptions" :key="opt.id || '__src'" :value="opt.id">{{ opt.name }}</option>
        </select>
      </label>
      <label class="filter-field">
        <span>{{ t('metrics.providerFilter') }}</span>
        <select v-model="filterProvider">
          <option v-for="opt in providerOptions" :key="opt.id || '__prov'" :value="opt.id">{{ opt.name }}</option>
        </select>
      </label>
      <label class="filter-field">
        <span>{{ t('metrics.timeRange') }}</span>
        <select v-model="filterTimeRange">
          <option value="session">{{ t('metrics.timeSession') }}</option>
          <option value="1h">{{ t('metrics.time1h') }}</option>
        </select>
      </label>
      <label v-if="detached" class="filter-field">
        <span>{{ t('metrics.themeFilter') }}</span>
        <select v-model="themeMode">
          <option value="follow">{{ t('metrics.themeFollow') }}</option>
          <option value="vscode">{{ t('settings.theme.vscode') }}</option>
          <option value="aura-light">{{ t('settings.theme.auraLight') }}</option>
          <option value="aura-dark">{{ t('settings.theme.auraDark') }}</option>
        </select>
      </label>
      <div class="toolbar-right">
        <span class="live-dot" :title="t('metrics.live')">● {{ t('metrics.live') }}</span>
      </div>
    </div>

    <div class="kpi-section-label">{{ t('metrics.realtime') }}</div>
    <div class="kpi-row">
      <div class="kpi" :title="t('metrics.ttftTip')">
        <div class="kpi-label">TTFT P95</div>
        <div class="kpi-val">{{ fmt(snapshot?.realtime.kpis.ttftP95 ?? 0, 0) }}<span class="unit">ms</span></div>
      </div>
      <div class="kpi" :title="t('metrics.e2eTip')">
        <div class="kpi-label">{{ t('metrics.e2eP95') }}</div>
        <div class="kpi-val">{{ fmt(snapshot?.realtime.kpis.e2eP95 ?? 0, 0) }}<span class="unit">ms</span></div>
      </div>
      <div class="kpi" :title="t('metrics.tpsTip')">
        <div class="kpi-label">TPS</div>
        <div class="kpi-val">{{ fmt(snapshot?.realtime.kpis.tps ?? 0) }}<span class="unit">tok/s</span></div>
      </div>
      <div class="kpi" :title="t('metrics.qpsTip')">
        <div class="kpi-label">QPS</div>
        <div class="kpi-val">{{ fmt(snapshot?.realtime.kpis.qps ?? 0, 2) }}<span class="unit">/s</span></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('metrics.errorRate') }}</div>
        <div class="kpi-val" :class="{ 'kpi-val--danger': (snapshot?.realtime.kpis.errorRate ?? 0) > 0 }">
          {{ fmt(snapshot?.realtime.kpis.errorRate ?? 0, 2) }}<span class="unit">%</span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Token</div>
        <div class="kpi-val">
          {{ fmt((snapshot?.realtime.kpis.tokensPerMin ?? 0) / 1000, 1) }}<span class="unit">k/min</span>
        </div>
      </div>
    </div>

    <div class="kpi-section-label">{{ t('metrics.cumulative') }}</div>
    <div class="kpi-row">
      <div class="kpi" :title="t('metrics.ttftTip')">
        <div class="kpi-label">TTFT P95</div>
        <div class="kpi-val">{{ fmt(snapshot?.cumulative.kpis.ttftP95 ?? 0, 0) }}<span class="unit">ms</span></div>
      </div>
      <div class="kpi" :title="t('metrics.e2eTip')">
        <div class="kpi-label">{{ t('metrics.e2eP95') }}</div>
        <div class="kpi-val">{{ fmt(snapshot?.cumulative.kpis.e2eP95 ?? 0, 0) }}<span class="unit">ms</span></div>
      </div>
      <div class="kpi" :title="t('metrics.tpsTip')">
        <div class="kpi-label">TPS</div>
        <div class="kpi-val">{{ fmt(snapshot?.cumulative.kpis.tps ?? 0) }}<span class="unit">tok/s</span></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('metrics.totalTokens') }}</div>
        <div class="kpi-val">
          {{ fmt((snapshot?.cumulative.kpis.totalTokens ?? 0) / 1000, 1) }}<span class="unit">k</span>
          <span v-if="snapshot?.cumulative.kpis.tokensEstimated" class="est-badge">{{ t('metrics.estimated') }}</span>
        </div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('metrics.inputTokens') }}</div>
        <div class="kpi-val">{{ fmt((snapshot?.cumulative.kpis.inputTokens ?? 0) / 1000, 1) }}<span class="unit">k</span></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('metrics.outputTokens') }}</div>
        <div class="kpi-val">{{ fmt((snapshot?.cumulative.kpis.outputTokens ?? 0) / 1000, 1) }}<span class="unit">k</span></div>
      </div>
      <div class="kpi">
        <div class="kpi-label">{{ t('metrics.totalCalls') }}</div>
        <div class="kpi-val">{{ snapshot?.cumulative.kpis.totalCalls ?? 0 }}</div>
      </div>
    </div>

    <div v-if="mergedModelRows.length" class="model-table-wrap">
      <table class="model-table">
        <thead>
          <tr>
            <th>{{ t('metrics.model') }}</th>
            <th>{{ t('metrics.calls') }}</th>
            <th>{{ t('metrics.errorRate') }}</th>
            <th>TTFT</th>
            <th>{{ t('metrics.e2eP95') }}</th>
            <th>TPS</th>
            <th>Token</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in mergedModelRows" :key="m.modelId">
            <td class="model-name">{{ m.modelName }}<span class="model-meta">{{ m.provider }}</span></td>
            <td class="num">{{ m.callCount }}</td>
            <td class="num" :class="{ 'num--danger': m.errorRate > 0 }">{{ fmt(m.errorRate, 2) }}%</td>
            <td class="num">{{ fmt(m.cumTtft, 0) }} ms</td>
            <td class="num">{{ fmt(m.cumE2e, 0) }} ms</td>
            <td class="num">{{ fmt(m.cumTps) }}</td>
            <td class="num">
              {{ fmt(m.totalTokens / 1000, 1) }}k<span v-if="m.tokensEstimated" class="est-inline">≈</span>
            </td>
            <td>
              <button type="button" class="link-btn" :title="t('metrics.openTrace')" @click="onOpenTrace(m.modelId)">
                Trace
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div ref="chartsEl" class="charts" :class="{ 'charts--expanded': expanded }">
      <div class="chart-card">
        <div class="chart-title">TTFT P50 / P95 (ms)</div>
        <div class="chart-canvas-wrap"><canvas ref="chartTtft" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ t('metrics.chartE2e') }}</div>
        <div class="chart-canvas-wrap"><canvas ref="chartE2e" /></div>
      </div>
      <div class="chart-card chart-card--gauge">
        <div class="chart-title">TPS</div>
        <div class="chart-canvas-wrap"><canvas ref="chartTpsGauge" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">TPS / QPS</div>
        <div class="chart-canvas-wrap"><canvas ref="chartTps" /></div>
      </div>
      <div class="chart-card chart-card--gauge">
        <div class="chart-title">{{ t('metrics.errorRate') }} / {{ t('metrics.successRate') }}</div>
        <div class="chart-canvas-wrap"><canvas ref="chartErr" /></div>
      </div>
      <div class="chart-card chart-card--terminal">
        <div class="chart-title">{{ t('metrics.activityFeed') }}</div>
        <div ref="activityLogEl" class="activity-terminal">
          <div v-if="!filteredActivityLog.length" class="activity-empty">{{ t('metrics.noData') }}</div>
          <div
            v-for="line in filteredActivityLog"
            :key="line.id"
            class="activity-line"
            :class="[line.kind, { fail: line.ok === false }]"
          >
            <span class="activity-time">[{{ fmtActivityTime(line.ts) }}]</span>
            <span class="activity-kind">{{ activityKindLabel(line.kind) }}</span>
            <span class="activity-text">{{ line.text }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metrics-root {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
  color: var(--wc-text);
  font-family: var(--wc-font-ui, system-ui, sans-serif);
  background: transparent;
}

.metrics-root.expanded {
  padding: 8px 12px;
  gap: 6px;
  background: var(--wc-panel);
}

.metrics-toolbar,
.kpi-section-label,
.kpi-row {
  flex-shrink: 0;
}

.metrics-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
}

.filter-field {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--wc-text-muted);
}

.filter-field select {
  background: var(--wc-input-bg);
  color: var(--wc-text);
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  padding: 3px 8px;
  font-size: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.live-dot {
  color: #16a34a;
  font-size: 11px;
}

.kpi-section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--wc-text);
  letter-spacing: 0.02em;
}

.kpi-row {
  display: flex;
  gap: 6px;
  width: 100%;
}

.kpi {
  flex: 1 1 0;
  min-width: 0;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  padding: 6px 8px;
}

.expanded .kpi-row {
  gap: 8px;
}

.expanded .kpi {
  padding: 8px 10px;
  text-align: center;
}

.expanded .kpi-val {
  font-size: 17px;
}

.kpi-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: var(--wc-text-muted);
}

.kpi-val {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--wc-text);
}

.kpi-val--danger {
  color: var(--wc-diff-del-fg);
}

.unit {
  font-size: 11px;
  font-weight: 400;
  color: var(--wc-text-muted);
  margin-left: 2px;
}

.est-badge {
  font-size: 10px;
  color: var(--wc-text-muted);
  margin-left: 4px;
}

.model-table-wrap {
  flex-shrink: 0;
  overflow: auto;
  max-height: 100px;
}

.expanded .model-table-wrap {
  max-height: 120px;
}

.model-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.model-table th {
  text-align: left;
  padding: 4px 8px 4px 0;
  color: var(--wc-text-muted);
  border-bottom: 1px solid var(--wc-border);
  font-weight: 600;
}

.model-table td {
  padding: 4px 8px 4px 0;
}

.model-name {
  color: var(--wc-text);
}

.model-meta {
  display: block;
  font-size: 10px;
  color: var(--wc-text-muted);
}

.num {
  color: var(--wc-text);
  font-variant-numeric: tabular-nums;
}

.num--danger {
  color: var(--wc-diff-del-fg);
}

.est-inline {
  color: var(--wc-text-muted);
  margin-left: 2px;
}

.link-btn {
  border: none;
  background: transparent;
  color: var(--wc-accent, #3794ff);
  font-size: 11px;
  cursor: pointer;
  padding: 0;
}

.link-btn:hover {
  text-decoration: underline;
}

.charts {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(72px, auto));
  gap: 6px;
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.chart-card--gauge .chart-canvas-wrap {
  min-height: 80px;
}

.chart-card--terminal {
  min-height: 0;
}

.activity-terminal {
  flex: 1;
  min-height: 56px;
  overflow: auto;
  background: var(--wc-bg-dark);
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  padding: 6px 8px;
  font-family: var(--wc-font-mono, ui-monospace, 'Cascadia Code', Menlo, monospace);
  font-size: 10px;
  line-height: 1.45;
}

.charts--expanded .activity-terminal {
  min-height: 0;
}

.activity-empty {
  color: var(--wc-text-muted);
}

.activity-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 1px 0;
  color: var(--wc-text);
  animation: activity-rise 0.28s ease-out;
}

.activity-line.fail .activity-kind,
.activity-line.fail .activity-text {
  color: var(--wc-diff-del-fg);
}

.activity-line.model_call .activity-kind {
  color: var(--wc-accent);
}

.activity-line.tool_call .activity-kind {
  color: var(--wc-metrics-tool-call, #dcdcaa);
}

.activity-line.tool_result .activity-kind {
  color: var(--wc-diff-add-fg);
}

.activity-line.first_token .activity-kind {
  color: var(--wc-diff-hunk-fg);
}

.activity-time {
  color: var(--wc-text-dim);
  flex-shrink: 0;
}

.activity-kind {
  font-weight: 600;
  flex-shrink: 0;
}

.activity-text {
  color: var(--wc-text-muted);
  min-width: 0;
  word-break: break-all;
}

@keyframes activity-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.charts--expanded {
  grid-template-rows: repeat(2, minmax(0, 1fr));
  overflow: hidden;
}

.chart-card {
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: var(--wc-input-bg);
}

.chart-title {
  font-size: 12px;
  color: var(--wc-text);
  margin-bottom: 4px;
}

.chart-canvas-wrap {
  flex: 1;
  min-height: 56px;
  position: relative;
}

.charts--expanded .chart-canvas-wrap {
  min-height: 72px;
}

canvas {
  display: block;
}
</style>

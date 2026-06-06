<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from '../../i18n'
import type { AiMetricsFilter, AiMetricsSnapshot, AiMetricsSource, AppTheme } from '../../types/axecoder'
import {
  applyMetricsWindowTheme,
  getMetricsWindowThemeMode,
  setMetricsWindowThemeMode,
  type MetricsWindowThemeMode,
} from '../../utils/metrics-window-theme'

const props = defineProps<{
  expanded?: boolean
  detached?: boolean
  showDetachControls?: boolean
  globalTheme?: AppTheme
}>()

const emit = defineEmits<{
  detach: []
  dock: []
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
const chartTokenSplit = ref<HTMLCanvasElement | null>(null)
const chartCumulative = ref<HTMLCanvasElement | null>(null)
const chartSource = ref<HTMLCanvasElement | null>(null)
const chartOutcome = ref<HTMLCanvasElement | null>(null)
const chartInputHist = ref<HTMLCanvasElement | null>(null)

const SOURCE_COLORS: Record<AiMetricsSource, string> = {
  chat: '#2563eb',
  agent: '#22c55e',
  workshop: '#a78bfa',
  other: '#94a3b8',
}

let offMetrics: (() => void) | undefined
let themeObs: MutationObserver | undefined

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
  await nextTick()
  redrawCharts()
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
  const dpr = window.devicePixelRatio || 1
  const w = parent.clientWidth
  const h = parent.clientHeight
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

const drawStackedBars = (
  canvas: HTMLCanvasElement | null,
  okVals: number[],
  failVals: number[],
  hasActivity: boolean,
  large: boolean,
  ui: ReturnType<typeof chartUiColors>,
) => {
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  const dpr = window.devicePixelRatio || 1
  const w = parent.clientWidth
  const h = parent.clientHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const pad = { l: 8, r: 8, t: 10, b: 20 }
  const n = okVals.length
  if (!hasActivity || !n) {
    ctx.fillStyle = ui.muted
    ctx.font = '11px sans-serif'
    ctx.fillText(t('metrics.noData'), pad.l, pad.t + 20)
    return
  }
  const maxV = Math.max(...okVals.map((v, i) => v + (failVals[i] ?? 0)), 1)
  const barW = Math.max(4, (w - pad.l - pad.r) / n - 2)
  okVals.forEach((ok, i) => {
    const fail = failVals[i] ?? 0
    const total = ok + fail
    const x = pad.l + i * ((w - pad.l - pad.r) / n) + 1
    const baseY = h - pad.b
    const okH = (ok / maxV) * (h - pad.t - pad.b)
    const failH = (fail / maxV) * (h - pad.t - pad.b)
    if (ok > 0) {
      ctx.fillStyle = '#22c55e'
      ctx.fillRect(x, baseY - okH, barW, okH)
    }
    if (fail > 0) {
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(x, baseY - okH - failH, barW, failH)
    }
    if (total === 0 && large) {
      ctx.fillStyle = ui.grid
      ctx.fillRect(x, baseY - 2, barW, 2)
    }
  })
  ctx.font = '10px sans-serif'
  ctx.fillStyle = '#22c55e'
  ctx.fillRect(w - 60, pad.t, 10, 3)
  ctx.fillStyle = ui.text
  ctx.fillText('OK', w - 46, pad.t + 2)
  ctx.fillStyle = '#ef4444'
  ctx.fillRect(w - 60, pad.t + 14, 10, 3)
  ctx.fillStyle = ui.text
  ctx.fillText('Fail', w - 46, pad.t + 16)
}

const drawDonut = (
  canvas: HTMLCanvasElement | null,
  items: { label: string; value: number; color: string }[],
  hasActivity: boolean,
  ui: ReturnType<typeof chartUiColors>,
) => {
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  const dpr = window.devicePixelRatio || 1
  const w = parent.clientWidth
  const h = parent.clientHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const total = items.reduce((s, it) => s + it.value, 0)
  if (!hasActivity || total <= 0) {
    ctx.fillStyle = ui.muted
    ctx.font = '11px sans-serif'
    ctx.fillText(t('metrics.noData'), 12, h / 2)
    return
  }
  const cx = w * 0.38
  const cy = h / 2
  const r = Math.min(w, h) * 0.32
  const ir = r * 0.55
  let angle = -Math.PI / 2
  for (const it of items) {
    if (it.value <= 0) continue
    const sweep = (it.value / total) * Math.PI * 2
    ctx.beginPath()
    ctx.arc(cx, cy, r, angle, angle + sweep)
    ctx.arc(cx, cy, ir, angle + sweep, angle, true)
    ctx.closePath()
    ctx.fillStyle = it.color
    ctx.fill()
    angle += sweep
  }
  let ly = 12
  ctx.font = '10px sans-serif'
  for (const it of items) {
    if (it.value <= 0) continue
    ctx.fillStyle = it.color
    ctx.fillRect(w * 0.62, ly - 8, 10, 3)
    ctx.fillStyle = ui.text
    const pct = ((it.value / total) * 100).toFixed(0)
    ctx.fillText(`${it.label} ${pct}%`, w * 0.62 + 14, ly)
    ly += 14
  }
}

const drawHistogram = (
  canvas: HTMLCanvasElement | null,
  bins: { label: string; count: number }[],
  hasActivity: boolean,
  ui: ReturnType<typeof chartUiColors>,
) => {
  if (!canvas) return
  const parent = canvas.parentElement
  if (!parent) return
  const dpr = window.devicePixelRatio || 1
  const w = parent.clientWidth
  const h = parent.clientHeight
  canvas.width = w * dpr
  canvas.height = h * dpr
  canvas.style.width = `${w}px`
  canvas.style.height = `${h}px`
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)
  const pad = { l: 8, r: 8, t: 8, b: 22 }
  const n = bins.length
  if (!hasActivity || !n) {
    ctx.fillStyle = ui.muted
    ctx.font = '11px sans-serif'
    ctx.fillText(t('metrics.noData'), pad.l, pad.t + 20)
    return
  }
  const maxV = Math.max(...bins.map((b) => b.count), 1)
  const slot = (w - pad.l - pad.r) / n
  bins.forEach((bin, i) => {
    const barH = (bin.count / maxV) * (h - pad.t - pad.b)
    const x = pad.l + i * slot + slot * 0.15
    const barW = slot * 0.7
    ctx.fillStyle = '#2563eb'
    ctx.fillRect(x, h - pad.b - barH, barW, barH)
    ctx.fillStyle = ui.muted
    ctx.font = '9px sans-serif'
    ctx.fillText(bin.label, x, h - 4)
    if (bin.count > 0) {
      ctx.fillStyle = ui.text
      ctx.font = '9px sans-serif'
      ctx.fillText(String(bin.count), x, h - pad.b - barH - 4)
    }
  })
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
  const advActivity = (snapshot.value?.cumulative.kpis.totalCalls ?? 0) > 0

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
  drawLineChart(
    chartErr.value,
    [
      { label: t('metrics.errorRate'), color: '#ef4444', values: pts.map((p) => p.errorRate) },
      { label: 'Token/min', color: '#2563eb', values: pts.map((p) => p.tokensPerMin / 1000) },
    ],
    hasActivity,
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
  drawLineChart(
    chartTokenSplit.value,
    [
      { label: 'In', color: '#2563eb', values: pts.map((p) => p.inputTokens / 1000) },
      { label: 'Out', color: '#22c55e', values: pts.map((p) => p.outputTokens / 1000) },
    ],
    hasActivity,
    large,
    ui,
  )
  drawLineChart(
    chartCumulative.value,
    [{ label: 'Total k', color: '#0ea5e9', values: pts.map((p) => p.cumulativeTokens / 1000) }],
    hasActivity,
    large,
    ui,
  )
  const breakdown = snapshot.value?.sourceBreakdown ?? []
  drawDonut(
    chartSource.value,
    breakdown.map((row) => ({
      label: sourceLabel(row.source),
      value: row.calls,
      color: SOURCE_COLORS[row.source],
    })),
    advActivity,
    ui,
  )
  drawStackedBars(
    chartOutcome.value,
    pts.map((p) => p.okCount),
    pts.map((p) => p.failCount),
    hasActivity,
    large,
    ui,
  )
  drawHistogram(chartInputHist.value, snapshot.value?.inputTokenHistogram ?? [], advActivity, ui)
}

const fmt = (v: number, digits = 1) => (Number.isFinite(v) ? v.toFixed(digits) : '—')

const onDetach = () => {
  emit('detach')
  void window.axecoder.openMetricsWindow()
}

const onDock = () => {
  void window.axecoder.closeMetricsWindow()
  emit('dock')
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

onMounted(async () => {
  if (props.detached) syncDetachedTheme()
  await loadSnapshot()
  offMetrics = window.axecoder.onAiMetricsUpdate((snap) => {
    if (needsRefetch()) {
      void window.axecoder.getAiMetricsSnapshot(buildFilter()).then((s) => {
        snapshot.value = s
        void nextTick().then(redrawCharts)
      })
    } else {
      snapshot.value = snap
      void nextTick().then(redrawCharts)
    }
  })
  window.addEventListener('resize', redrawCharts)
  themeObs = new MutationObserver(() => {
    void nextTick().then(redrawCharts)
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onUnmounted(() => {
  offMetrics?.()
  themeObs?.disconnect()
  window.removeEventListener('resize', redrawCharts)
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
      <div v-if="showDetachControls" class="detach-actions">
        <button v-if="!detached" type="button" class="tb-btn" @click="onDetach">{{ t('metrics.detach') }}</button>
        <button v-else type="button" class="tb-btn" @click="onDock">{{ t('metrics.dock') }}</button>
      </div>
      <span class="live-dot" :title="t('metrics.live')">● {{ t('metrics.live') }}</span>
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
    <div class="kpi-row kpi-row--7">
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

    <div class="charts" :class="{ 'charts--expanded': expanded }">
      <div class="chart-card">
        <div class="chart-title">TTFT P50 / P95 (ms)</div>
        <div class="chart-canvas-wrap"><canvas ref="chartTtft" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ t('metrics.chartE2e') }}</div>
        <div class="chart-canvas-wrap"><canvas ref="chartE2e" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">TPS / QPS</div>
        <div class="chart-canvas-wrap"><canvas ref="chartTps" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ t('metrics.chartTokenSplit') }}</div>
        <div class="chart-canvas-wrap"><canvas ref="chartTokenSplit" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ t('metrics.errorRate') }} / Token</div>
        <div class="chart-canvas-wrap"><canvas ref="chartErr" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ t('metrics.chartCumulative') }}</div>
        <div class="chart-canvas-wrap"><canvas ref="chartCumulative" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ t('metrics.chartSource') }}</div>
        <div class="chart-canvas-wrap"><canvas ref="chartSource" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ t('metrics.chartOutcome') }}</div>
        <div class="chart-canvas-wrap"><canvas ref="chartOutcome" /></div>
      </div>
      <div class="chart-card">
        <div class="chart-title">{{ t('metrics.chartInputHist') }}</div>
        <div class="chart-canvas-wrap"><canvas ref="chartInputHist" /></div>
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
  padding: 12px 16px;
  background: var(--wc-panel);
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

.detach-actions {
  margin-left: auto;
}

.tb-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--wc-border);
  background: var(--wc-input-bg);
  color: var(--wc-text);
  font-size: 12px;
}

.tb-btn:hover {
  background: var(--wc-hover);
}

.live-dot {
  color: #16a34a;
  font-size: 11px;
  margin-left: auto;
}

.kpi-section-label {
  font-size: 11px;
  font-weight: 600;
  color: var(--wc-text);
  letter-spacing: 0.02em;
}

.kpi-row {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 6px;
}

.kpi-row--7 {
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.kpi {
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  padding: 8px 10px;
}

.expanded .kpi-val {
  font-size: 20px;
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
  overflow: auto;
  max-height: 120px;
}

.expanded .model-table-wrap {
  max-height: 180px;
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
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  grid-auto-rows: minmax(100px, auto);
  gap: 8px;
  flex: 1;
  min-height: 120px;
  overflow: auto;
}

.charts--expanded {
  min-height: 360px;
}

.chart-card {
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: var(--wc-input-bg);
}

.chart-title {
  font-size: 12px;
  color: var(--wc-text);
  margin-bottom: 4px;
}

.chart-canvas-wrap {
  flex: 1;
  min-height: 64px;
  position: relative;
}

.charts--expanded .chart-canvas-wrap {
  min-height: 160px;
}

canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>

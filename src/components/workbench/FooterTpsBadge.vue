<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from '../../i18n'
import type { AiMetricsActivityLine, AiMetricsSnapshot } from '../../types/axecoder'

const props = defineProps<{
  live?: boolean
}>()

const { t } = useI18n()

const snapshot = ref<AiMetricsSnapshot | null>(null)
const activityLog = ref<AiMetricsActivityLine[]>([])
const hover = ref(false)
const rootRef = ref<HTMLElement | null>(null)
const popoverLeft = ref(0)
const popoverBottom = ref(0)
const activityLogEl = ref<HTMLElement | null>(null)

const ACTIVITY_MAX = 50
const POPOVER_W = 380

const pickDisplayTps = (snap: AiMetricsSnapshot): number => {
  const rt = snap.realtime.kpis.tps
  if (rt > 0.05) return rt
  if (snap.concurrent > 0) {
    const cum = snap.cumulative.kpis.tps
    if (cum > 0.05) return cum
    const tpm = snap.realtime.kpis.tokensPerMin
    if (tpm > 0) return tpm / 60
  }
  if (props.live) {
    const pts = snap.series
    for (let i = pts.length - 1; i >= 0; i--) {
      if (pts[i]!.tps > 0.05) return pts[i]!.tps
    }
    const cum = snap.cumulative.kpis.tps
    if (cum > 0.05) return cum
  }
  return 0
}

const displayTps = computed(() => {
  const snap = snapshot.value
  if (!snap) return 0
  return pickDisplayTps(snap)
})

const formattedTps = computed(() => {
  const v = displayTps.value
  if (v <= 0) return '0'
  return v < 10 ? v.toFixed(1) : String(Math.round(v))
})

const formattedTpsDetail = computed(() => {
  const v = displayTps.value
  return Number.isFinite(v) ? v.toFixed(1) : '—'
})

const showLive = computed(() => props.live || displayTps.value > 0.05)

const filteredActivity = computed(() => activityLog.value.slice(-ACTIVITY_MAX))

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

const syncPopoverPos = () => {
  const el = rootRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const maxLeft = window.innerWidth - POPOVER_W - 8
  popoverLeft.value = Math.max(8, Math.min(r.left + r.width / 2 - POPOVER_W / 2, maxLeft))
  popoverBottom.value = window.innerHeight - r.top + 8
}

const scrollActivityToBottom = () => {
  const el = activityLogEl.value
  if (!el) return
  el.scrollTop = el.scrollHeight
}

const onEnter = () => {
  hover.value = true
  void nextTick(() => {
    syncPopoverPos()
    scrollActivityToBottom()
  })
}

const onLeave = () => {
  hover.value = false
}

let offMetrics: (() => void) | undefined
let offActivity: (() => void) | undefined

const applySnap = (snap: AiMetricsSnapshot) => {
  snapshot.value = snap
  if (snap.activityLog?.length) {
    activityLog.value = snap.activityLog
    if (hover.value) void nextTick(scrollActivityToBottom)
  }
}

watch(
  () => filteredActivity.value.at(-1)?.id,
  () => {
    if (hover.value) void nextTick(scrollActivityToBottom)
  },
  { flush: 'post' },
)

onMounted(async () => {
  applySnap(await window.axecoder.getAiMetricsSnapshot())
  offMetrics = window.axecoder.onAiMetricsUpdate((s) => applySnap(s))
  offActivity = window.axecoder.onAiMetricsActivity((lines) => {
    activityLog.value = lines
    if (hover.value) void nextTick(scrollActivityToBottom)
  })
  window.addEventListener('resize', syncPopoverPos)
})

onUnmounted(() => {
  offMetrics?.()
  offActivity?.()
  window.removeEventListener('resize', syncPopoverPos)
})
</script>

<template>
  <div
    ref="rootRef"
    class="footer-tps-wrap"
    @mouseenter="onEnter"
    @mouseleave="onLeave"
  >
    <div class="footer-tps" :class="{ live: showLive }" :title="t('metrics.tpsTip')">
      <span class="footer-tps-dot" aria-hidden="true" />
      <span class="footer-tps-num">{{ formattedTps }}</span>
      <span class="footer-tps-label">TPS</span>
    </div>
    <Teleport to="body">
      <div
        v-show="hover"
        class="footer-tps-popover"
        :style="{ left: `${popoverLeft}px`, bottom: `${popoverBottom}px`, width: `${POPOVER_W}px` }"
        @mouseenter="onEnter"
        @mouseleave="onLeave"
      >
        <div class="footer-tps-popover-head">
          <span class="footer-tps-popover-tps">{{ formattedTpsDetail }}</span>
          <span class="footer-tps-popover-unit">tok/s</span>
        </div>
        <div class="footer-tps-popover-title">{{ t('metrics.activityFeed') }}</div>
        <div ref="activityLogEl" class="footer-tps-activity">
          <div v-if="!filteredActivity.length" class="footer-tps-activity-empty">
            {{ t('metrics.noData') }}
          </div>
          <div
            v-for="line in filteredActivity"
            :key="line.id"
            class="footer-tps-activity-line"
            :class="[line.kind, { fail: line.ok === false }]"
          >
            <span class="activity-time">[{{ fmtActivityTime(line.ts) }}]</span>
            <span class="activity-kind">{{ activityKindLabel(line.kind) }}</span>
            <span class="activity-text">{{ line.text }}</span>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.footer-tps-wrap {
  position: relative;
  flex-shrink: 0;
}

.footer-tps {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11px;
  line-height: 1;
  color: var(--wc-text-dim, rgba(255, 255, 255, 0.45));
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  user-select: none;
  cursor: default;
  transition:
    color 0.2s,
    border-color 0.2s,
    background 0.2s;
}

.footer-tps.live {
  color: var(--wc-metrics-success, var(--wc-diff-add-fg));
  border-color: color-mix(in srgb, var(--wc-metrics-success, var(--wc-diff-add-fg)) 28%, transparent);
  background: color-mix(in srgb, var(--wc-metrics-success, var(--wc-diff-add-fg)) 10%, transparent);
  box-shadow: 0 0 12px color-mix(in srgb, var(--wc-metrics-success, var(--wc-diff-add-fg)) 12%, transparent);
}

.footer-tps-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: currentColor;
  opacity: 0.45;
}

.footer-tps.live .footer-tps-dot {
  opacity: 1;
  animation: footer-tps-pulse 1.4s ease-in-out infinite;
}

.footer-tps-num {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  min-width: 1.5em;
  text-align: right;
}

.footer-tps-label {
  font-size: 10px;
  letter-spacing: 0.04em;
  opacity: 0.85;
}

@keyframes footer-tps-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.35);
    opacity: 0.55;
  }
}

.footer-tps-popover {
  position: fixed;
  z-index: 10000;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--wc-panel, #1e1e1e);
  border: 1px solid var(--wc-border, rgba(255, 255, 255, 0.12));
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  color: var(--wc-text);
  font-family: var(--wc-font-ui, system-ui, sans-serif);
  pointer-events: auto;
}

.footer-tps-popover-head {
  display: flex;
  align-items: baseline;
  gap: 4px;
  padding-bottom: 4px;
  border-bottom: 1px solid var(--wc-border, rgba(255, 255, 255, 0.08));
}

.footer-tps-popover-tps {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--wc-metrics-success, var(--wc-diff-add-fg));
  line-height: 1;
}

.footer-tps-popover-unit {
  font-size: 11px;
  color: var(--wc-text-muted);
}

.footer-tps-popover-title {
  font-size: 11px;
  font-weight: 600;
  color: var(--wc-text-muted);
  letter-spacing: 0.02em;
}

.footer-tps-activity {
  max-height: 220px;
  overflow: auto;
  background: var(--wc-bg-dark, rgba(0, 0, 0, 0.25));
  border: 1px solid var(--wc-border, rgba(255, 255, 255, 0.08));
  border-radius: 4px;
  padding: 6px 8px;
  font-family: var(--wc-font-mono, ui-monospace, 'Cascadia Code', Menlo, monospace);
  font-size: 10px;
  line-height: 1.45;
}

.footer-tps-activity-empty {
  color: var(--wc-text-muted);
}

.footer-tps-activity-line {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 1px 0;
  color: var(--wc-text);
}

.footer-tps-activity-line.fail .activity-kind,
.footer-tps-activity-line.fail .activity-text {
  color: var(--wc-diff-del-fg, #f87171);
}

.footer-tps-activity-line.model_call .activity-kind {
  color: var(--wc-accent, #569cd6);
}

.footer-tps-activity-line.tool_call .activity-kind {
  color: var(--wc-metrics-tool-call, #dcdcaa);
}

.footer-tps-activity-line.tool_result .activity-kind {
  color: var(--wc-diff-add-fg, #4ade80);
}

.footer-tps-activity-line.first_token .activity-kind {
  color: var(--wc-diff-hunk-fg, #ce9178);
}

.activity-time {
  color: var(--wc-text-dim);
  flex-shrink: 0;
}

.activity-kind {
  flex-shrink: 0;
  font-weight: 600;
}

.activity-text {
  word-break: break-word;
}
</style>

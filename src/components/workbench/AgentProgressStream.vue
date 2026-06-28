<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  activeProgressHeadline,
  sliceProgressStepsForDisplay,
  type AgentProgressStep,
} from '../../utils/agent-progress'

type SubagentTaskView = {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
}

const props = defineProps<{
  steps: AgentProgressStep[]
  streamText: string
  subagentTasks: SubagentTaskView[]
  agentMode: boolean
  fallbackHeadline?: string
  thinkingText?: string
  thinkingType?: string
  loopGuardNotice?: string
}>()

const safeThinkingText = computed(() => {
  const raw = props.thinkingText
  return typeof raw === 'string' ? raw : ''
})

const safeThinkingType = computed(() => {
  const raw = props.thinkingType
  return typeof raw === 'string' ? raw : ''
})

const expanded = ref(false)
const thinkingExpanded = ref(false)
const thinkingTextEl = ref<HTMLElement | null>(null)
const thinkingStartedAt = ref<number | null>(null)
const thinkingTick = ref(0)
let thinkingTimer: ReturnType<typeof setInterval> | undefined
/** 用户手动展开的已完成 step */
const stepDetailExpanded = ref<Set<string>>(new Set())

const syncThinkingTimer = (active: boolean) => {
  if (active) {
    if (!thinkingTimer) {
      thinkingTimer = setInterval(() => {
        thinkingTick.value++
      }, 1000)
    }
    return
  }
  if (thinkingTimer) {
    clearInterval(thinkingTimer)
    thinkingTimer = undefined
  }
}

watch(safeThinkingText, (text, prev) => {
  const has = !!text.trim()
  const had = !!prev?.trim()
  if (has && !had) {
    thinkingStartedAt.value = Date.now()
    thinkingExpanded.value = false
  }
  if (!has) thinkingStartedAt.value = null
  syncThinkingTimer(has)
  nextTick(() => {
    if (!thinkingExpanded.value) return
    const el = thinkingTextEl.value
    if (el) el.scrollTop = el.scrollHeight
  })
})

onUnmounted(() => syncThinkingTimer(false))

const thinkingSeconds = computed(() => {
  void thinkingTick.value
  if (!thinkingStartedAt.value) return 0
  return Math.max(1, Math.round((Date.now() - thinkingStartedAt.value) / 1000))
})

const isBashStep = (step: AgentProgressStep) =>
  step.phase === 'tool' && step.toolName?.toLowerCase() === 'bash'

watch(
  () => props.steps,
  (steps) => {
    const open = stepDetailExpanded.value
    const ids = new Set(steps.map((s) => s.id))
    for (const id of open) {
      if (!ids.has(id)) open.delete(id)
    }
  },
  { deep: true },
)

const displayHeadline = computed(() => {
  if (props.agentMode && props.steps.length) return activeProgressHeadline(props.steps)
  return props.fallbackHeadline ?? 'Working…'
})

const sliced = computed(() =>
  sliceProgressStepsForDisplay(props.steps, expanded.value),
)
const visibleSteps = computed(() => sliced.value.visible)
const hiddenCount = computed(() => sliced.value.hiddenCount)

const primaryForStep = (step: AgentProgressStep) => {
  if (step.phase === 'tool' && step.toolName) return step.toolName
  if (step.phase === 'model' && step.status === 'active') return 'Model Call'
  if (step.phase === 'model') return 'Model Result'
  return step.label
}

const isStepDetailOpen = (step: AgentProgressStep) => {
  if (!step.detail?.trim()) return false
  if (step.status === 'active') return true
  return stepDetailExpanded.value.has(step.id)
}

const toggleStepDetail = (step: AgentProgressStep) => {
  if (!step.detail?.trim() || step.status === 'active') return
  const next = new Set(stepDetailExpanded.value)
  if (next.has(step.id)) next.delete(step.id)
  else next.add(step.id)
  stepDetailExpanded.value = next
}

const secondaryForStep = (step: AgentProgressStep) => {
  if (step.phase === 'tool' && step.summary) return step.summary
  if (step.phase === 'model' && step.status === 'done') return `turn ${step.turn}`
  if (step.detail?.trim() && !isStepDetailOpen(step)) {
    const oneLine = step.detail.replace(/\s+/g, ' ').trim()
    return oneLine.length > 72 ? `${oneLine.slice(0, 72)}…` : oneLine
  }
  return ''
}

</script>

<template>
  <div class="agent-progress-stream">
    <div v-if="loopGuardNotice?.trim()" class="loop-guard-notice" role="status">
      ⚠ {{ loopGuardNotice }}
    </div>

    <button
      v-if="safeThinkingText.trim()"
      type="button"
      class="thought-toggle"
      :aria-expanded="thinkingExpanded"
      @click="thinkingExpanded = !thinkingExpanded"
    >
      Thought for {{ thinkingSeconds }}s
      <span class="thought-chevron" aria-hidden="true">{{ thinkingExpanded ? '▾' : '▸' }}</span>
    </button>
    <pre
      v-if="safeThinkingText.trim() && thinkingExpanded"
      ref="thinkingTextEl"
      class="thinking-text"
    >{{ safeThinkingText }}</pre>

    <div
      v-if="!(agentMode && visibleSteps.length)"
      class="stream-headline"
      :class="{ shimmer: agentMode && steps.some((s) => s.status === 'active') }"
    >
      <span class="headline-glyph" aria-hidden="true">›</span>
      <span class="headline-text">{{ displayHeadline }}</span>
    </div>

    <div v-if="agentMode && hiddenCount > 0" class="stream-expand">
      <button type="button" class="expand-btn" @click="expanded = true">
        Show {{ hiddenCount }} completed steps
      </button>
    </div>

    <div v-if="agentMode && visibleSteps.length" class="stream-rows">
      <div
        v-for="step in visibleSteps"
        :key="step.id"
        class="stream-step"
        :class="[step.phase, step.status]"
      >
        <div
          class="stream-row"
          :class="{ clickable: step.detail?.trim() && step.status !== 'active' }"
          @click="toggleStepDetail(step)"
        >
          <span class="row-indicator" :class="step.status" aria-hidden="true">
            <span v-if="step.status === 'error'" class="indicator-char">✗</span>
            <span v-else-if="step.status === 'done'" class="dot dot-done" />
            <span v-else-if="step.phase === 'model'" class="dot dot-model">
              <span class="dot-model-arc" />
            </span>
            <span v-else class="dot dot-active">
              <span class="dot-pulse" />
            </span>
          </span>
          <span v-if="step.detail?.trim() && step.status !== 'active'" class="row-chevron" aria-hidden="true">
            {{ isStepDetailOpen(step) ? '▾' : '▸' }}
          </span>
          <span class="row-primary">{{ primaryForStep(step) }}</span>
          <span v-if="secondaryForStep(step)" class="row-secondary">{{ secondaryForStep(step) }}</span>
        </div>
        <div v-if="isStepDetailOpen(step) && isBashStep(step)" class="bash-io-block">
          <div v-if="step.summary?.trim()" class="bash-io-row">
            <span class="io-label">IN</span>
            <pre class="io-body">{{ step.summary }}</pre>
          </div>
          <div v-if="step.detail?.trim()" class="bash-io-row">
            <span class="io-label">OUT</span>
            <pre class="io-body">{{ step.detail }}</pre>
          </div>
        </div>
        <pre v-else-if="isStepDetailOpen(step)" class="step-detail">{{ step.detail }}</pre>
      </div>
    </div>

    <div v-if="agentMode && subagentTasks.length" class="stream-rows subagent-rows">
      <div
        v-for="task in subagentTasks"
        :key="task.id"
        class="stream-row subagent"
        :class="task.status"
      >
        <span class="row-indicator" :class="task.status" aria-hidden="true">
          <span v-if="task.status === 'failed' || task.status === 'stopped'" class="indicator-char">✗</span>
          <span v-else-if="task.status === 'completed'" class="dot dot-done" />
          <span v-else class="dot dot-active">
            <span class="dot-pulse" />
          </span>
        </span>
        <span class="row-primary">Agent: {{ task.description }}</span>
      </div>
    </div>

    <div v-if="streamText.trim()" class="reasoning-block">
      <pre class="reasoning-text">{{ streamText }}</pre>
    </div>
  </div>
</template>

<style scoped>
.agent-progress-stream {
  font-family: var(--wc-font-sans, system-ui, sans-serif);
  font-size: 13px;
  line-height: 1.5;
  color: var(--wc-text-muted);
  background: transparent;
  padding: 2px 0 10px;
  max-width: 100%;
}

.loop-guard-notice {
  margin-bottom: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: color-mix(in srgb, #f59e0b 18%, transparent);
  color: var(--wc-text);
  font-size: 11px;
  line-height: 1.4;
}

.thought-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 10px;
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  font-size: 12px;
  color: var(--wc-text-muted);
  cursor: pointer;
}

.thought-toggle:hover {
  color: var(--wc-text);
}

.thought-chevron {
  font-size: 10px;
  opacity: 0.75;
}

.stream-headline {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--wc-text-muted);
  font-size: 12px;
  margin-bottom: 8px;
}

.stream-headline.shimmer .headline-text {
  animation: stream-shimmer 1.4s ease-in-out infinite;
}

@keyframes stream-shimmer {
  0%,
  100% {
    opacity: 0.55;
  }
  50% {
    opacity: 1;
  }
}

.headline-glyph {
  display: none;
}

.stream-expand {
  margin-bottom: 6px;
}

.expand-btn {
  padding: 0;
  border: none;
  background: none;
  color: var(--wc-accent, #7aa2f7);
  font-size: 11px;
  cursor: pointer;
  font-family: inherit;
}

.expand-btn:hover {
  text-decoration: underline;
}

.stream-rows {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.stream-step {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.stream-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.stream-row.clickable {
  cursor: pointer;
}

.stream-row.clickable:hover .row-primary {
  color: var(--wc-accent, #7aa2f7);
}

.row-chevron {
  flex-shrink: 0;
  width: 10px;
  color: var(--wc-text-dim);
  font-size: 10px;
}

.step-detail {
  margin: 4px 0 0 18px;
  padding: 8px 10px;
  max-height: 220px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  color: var(--wc-text);
  background: color-mix(in srgb, var(--wc-input-bg) 55%, var(--wc-panel));
  border-radius: 6px;
}

.bash-io-block {
  margin: 4px 0 0 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 220px;
  overflow: auto;
}

.bash-io-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 8px 10px;
  border-radius: 6px;
  background: color-mix(in srgb, var(--wc-input-bg) 55%, var(--wc-panel));
}

.io-label {
  flex-shrink: 0;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--wc-text-dim);
  padding-top: 2px;
}

.io-body {
  margin: 0;
  flex: 1;
  min-width: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  color: var(--wc-text);
}

.stream-row.error .indicator-char {
  color: #c45c5c;
}

.stream-row.tool.active .row-primary {
  color: var(--wc-accent, #7aa2f7);
}

.row-indicator {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicator-char {
  font-size: 11px;
  line-height: 1;
}

.dot {
  position: relative;
  display: block;
}

.dot-done {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #3ecf8e;
  box-shadow: 0 0 6px color-mix(in srgb, #3ecf8e 45%, transparent);
  animation: dot-pop 0.35s ease-out;
}

.dot-active {
  width: 8px;
  height: 8px;
}

.dot-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--wc-accent, #7aa2f7);
  animation: dot-breathe 1.2s ease-in-out infinite;
}

.dot-pulse::after {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 1.5px solid var(--wc-accent, #7aa2f7);
  animation: dot-ring 1.2s ease-out infinite;
}

.dot-model {
  width: 10px;
  height: 10px;
}

.dot-model-arc {
  display: block;
  width: 10px;
  height: 10px;
  border: 2px solid color-mix(in srgb, var(--wc-accent, #7aa2f7) 22%, transparent);
  border-top-color: var(--wc-accent, #7aa2f7);
  border-radius: 50%;
  animation: dot-spin 0.75s linear infinite;
}

@keyframes dot-breathe {
  0%,
  100% {
    transform: scale(0.82);
    opacity: 0.55;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes dot-ring {
  0% {
    transform: scale(0.75);
    opacity: 0.55;
  }
  100% {
    transform: scale(1.65);
    opacity: 0;
  }
}

@keyframes dot-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes dot-pop {
  0% {
    transform: scale(0);
    opacity: 0;
  }
  70% {
    transform: scale(1.2);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.row-primary {
  flex-shrink: 0;
  font-weight: 600;
  font-size: 13px;
  color: var(--wc-text);
}

.row-secondary {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--wc-text-dim);
}

.subagent-rows {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--wc-border);
}

.reasoning-block {
  margin-top: 8px;
  padding: 8px 0 0 10px;
  border-left: 2px solid var(--wc-border-light, var(--wc-border));
  max-height: 220px;
  overflow: auto;
}

.reasoning-text {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--wc-text-dim);
}

.thinking-text {
  margin: 0 0 10px;
  padding: 8px 10px;
  max-height: 180px;
  overflow-y: auto;
  overflow-anchor: none;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--wc-text-dim);
  background: color-mix(in srgb, var(--wc-input-bg) 55%, var(--wc-panel));
  border-radius: 6px;
}
</style>

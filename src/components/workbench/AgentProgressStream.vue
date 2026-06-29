<script setup lang="ts">
import { computed, nextTick, onUnmounted, ref, watch } from 'vue'
import {
  sliceProgressStepsForDisplay,
  type AgentProgressStep,
} from '../../utils/agent-progress'
import {
  nextSpinnerVerb,
  pickSpinnerVerb,
  SPINNER_ROTATE_MS,
} from '../../utils/spinner-verbs'
import AgentSpinnerGlyph from './AgentSpinnerGlyph.vue'

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
  running?: boolean
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
/** 用户手动展开的已完成 step（非 Bash） */
const stepDetailExpanded = ref<Set<string>>(new Set())
/** 用户手动收起的 Bash step（Bash 默认展开） */
const bashCollapsed = ref<Set<string>>(new Set())

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

onUnmounted(() => {
  syncThinkingTimer(false)
  syncSpinnerTimer(false)
})

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
    const collapsed = bashCollapsed.value
    const ids = new Set(steps.map((s) => s.id))
    for (const id of open) {
      if (!ids.has(id)) open.delete(id)
    }
    for (const id of collapsed) {
      if (!ids.has(id)) collapsed.delete(id)
    }
  },
  { deep: true },
)

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

const hasStepExpandable = (step: AgentProgressStep) =>
  !!(step.detail?.trim() || (isBashStep(step) && step.summary?.trim()))

const isStepDetailOpen = (step: AgentProgressStep) => {
  if (step.status === 'active' && hasStepExpandable(step)) return true
  if (!hasStepExpandable(step)) return false
  if (isBashStep(step)) return !bashCollapsed.value.has(step.id)
  return stepDetailExpanded.value.has(step.id)
}

const toggleStepDetail = (step: AgentProgressStep) => {
  if (!hasStepExpandable(step) || step.status === 'active') return
  if (isBashStep(step)) {
    const next = new Set(bashCollapsed.value)
    if (next.has(step.id)) next.delete(step.id)
    else next.add(step.id)
    bashCollapsed.value = next
    return
  }
  const next = new Set(stepDetailExpanded.value)
  if (next.has(step.id)) next.delete(step.id)
  else next.add(step.id)
  stepDetailExpanded.value = next
}

const streamingReply = computed(() => !!props.streamText.trim())

const displaySteps = computed(() => visibleSteps.value)

const displaySubagents = computed(() => props.subagentTasks)

const isRunning = computed(() => !!props.running)

const showThinkingPending = computed(
  () =>
    isRunning.value &&
    !streamingReply.value &&
    (props.agentMode
      ? !safeThinkingText.value.trim() &&
        displaySteps.value.length === 0 &&
        displaySubagents.value.length === 0
      : true),
)

const showWandering = computed(
  () =>
    isRunning.value &&
    props.agentMode &&
    !streamingReply.value &&
    !showThinkingPending.value &&
    (displaySteps.value.length > 0 ||
      displaySubagents.value.some((t) => t.status === 'running')),
)

const plainStatusLabel = computed(() => props.fallbackHeadline?.trim() || pickSpinnerVerb())

const spinnerLabel = ref(pickSpinnerVerb())
let spinnerTimer: ReturnType<typeof setInterval> | undefined

const showSpinnerRotation = computed(
  () =>
    props.agentMode &&
    isRunning.value &&
    !streamingReply.value &&
    (showThinkingPending.value || showWandering.value),
)

const syncSpinnerTimer = (active: boolean) => {
  if (active) {
    spinnerLabel.value = pickSpinnerVerb()
    if (!spinnerTimer) {
      spinnerTimer = setInterval(() => {
        spinnerLabel.value = nextSpinnerVerb(spinnerLabel.value)
      }, SPINNER_ROTATE_MS)
    }
    return
  }
  if (spinnerTimer) {
    clearInterval(spinnerTimer)
    spinnerTimer = undefined
  }
}

watch(showSpinnerRotation, syncSpinnerTimer, { immediate: true })

const showTrackSpine = computed(
  () =>
    isRunning.value ||
    showThinkingPending.value ||
    showWandering.value ||
    !!safeThinkingText.value.trim() ||
    (props.agentMode && hiddenCount.value > 0) ||
    (props.agentMode && displaySteps.value.length > 0) ||
    (props.agentMode && displaySubagents.value.length > 0),
)

const secondaryForStep = (step: AgentProgressStep) => {
  if (isStepDetailOpen(step)) return ''
  if (step.phase === 'tool' && step.summary) return step.summary
  if (step.phase === 'model' && step.status === 'done') return `turn ${step.turn}`
  if (step.detail?.trim()) {
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

    <div v-if="showTrackSpine" class="timeline-track">
      <div v-if="showThinkingPending" class="timeline-node timeline-node--status">
        <div class="timeline-marker">
          <AgentSpinnerGlyph />
        </div>
        <div class="timeline-content">
          <span class="status-label">{{
            showSpinnerRotation ? spinnerLabel : plainStatusLabel
          }}</span>
        </div>
      </div>

      <div v-if="safeThinkingText.trim()" class="timeline-node timeline-node--thought">
        <div class="timeline-marker">
          <span class="dot dot-thought" aria-hidden="true" />
        </div>
        <div class="timeline-content">
          <button
            type="button"
            class="thought-toggle"
            :aria-expanded="thinkingExpanded"
            @click="thinkingExpanded = !thinkingExpanded"
          >
            Thought for {{ thinkingSeconds }}s
            <span class="thought-chevron" aria-hidden="true">{{ thinkingExpanded ? '▾' : '›' }}</span>
          </button>
          <pre
            v-if="thinkingExpanded"
            ref="thinkingTextEl"
            class="thinking-text"
          >{{ safeThinkingText }}</pre>
        </div>
      </div>

      <div v-if="agentMode && hiddenCount > 0" class="timeline-node timeline-node--expand">
        <div class="timeline-marker">
          <span class="dot dot-muted" aria-hidden="true" />
        </div>
        <div class="timeline-content">
          <button type="button" class="expand-btn" @click="expanded = true">
            Show {{ hiddenCount }} completed step{{ hiddenCount > 1 ? 's' : '' }}
          </button>
        </div>
      </div>

      <div
        v-for="step in displaySteps"
        :key="step.id"
        class="timeline-node"
        :class="[step.phase, step.status]"
      >
        <div class="timeline-marker">
          <span class="row-indicator" aria-hidden="true">
            <span v-if="step.status === 'error'" class="indicator-char">×</span>
            <span v-else-if="step.status === 'done'" class="dot dot-done" />
            <AgentSpinnerGlyph v-else />
          </span>
        </div>
        <div class="timeline-content">
          <div
            class="stream-row"
            :class="{ clickable: hasStepExpandable(step) && step.status !== 'active' }"
            @click="toggleStepDetail(step)"
          >
            <span class="row-primary">{{ primaryForStep(step) }}</span>
            <span v-if="secondaryForStep(step)" class="row-secondary">{{ secondaryForStep(step) }}</span>
            <span
              v-if="hasStepExpandable(step) && step.status !== 'active'"
              class="row-chevron"
              aria-hidden="true"
            >{{ isStepDetailOpen(step) ? '▾' : '›' }}</span>
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
          <pre v-else-if="isStepDetailOpen(step) && step.detail?.trim()" class="step-detail">{{ step.detail }}</pre>
        </div>
      </div>

      <div
        v-if="agentMode"
        v-for="task in displaySubagents"
        :key="task.id"
        class="timeline-node subagent"
        :class="task.status"
      >
        <div class="timeline-marker">
          <span class="row-indicator" aria-hidden="true">
            <span v-if="task.status === 'failed' || task.status === 'stopped'" class="indicator-char">×</span>
            <span v-else-if="task.status === 'completed'" class="dot dot-done" />
            <AgentSpinnerGlyph v-else />
          </span>
        </div>
        <div class="timeline-content">
          <div class="stream-row">
            <span class="row-primary">Agent: {{ task.description }}</span>
          </div>
        </div>
      </div>

      <div v-if="showWandering" class="timeline-node timeline-node--status">
        <div class="timeline-marker">
          <AgentSpinnerGlyph />
        </div>
        <div class="timeline-content">
          <span class="status-label">{{ spinnerLabel }}</span>
        </div>
      </div>
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
  margin: 0;
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

.status-label {
  font-size: 12px;
  color: var(--wc-text-muted);
}

.timeline-track {
  position: relative;
  display: flex;
  flex-direction: column;
  margin-bottom: 2px;
}

.timeline-node {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 7px 0;
  position: relative;
  z-index: 1;
}

.timeline-marker {
  width: 9px;
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  padding-top: 5px;
  position: relative;
}

.timeline-marker::before,
.timeline-marker::after {
  content: '';
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 1px;
  background: color-mix(in srgb, var(--wc-border) 85%, transparent);
  pointer-events: none;
}

/* 圆点/转圈上方线段 */
.timeline-marker::before {
  top: 0;
  height: calc(5px + 4.5px - 3px);
}

/* 圆点/转圈下方线段 */
.timeline-marker::after {
  top: calc(5px + 4.5px + 3px);
  bottom: -7px;
}

.timeline-track > .timeline-node:first-child .timeline-marker::before {
  display: none;
}

.timeline-track > .timeline-node:last-child .timeline-marker::after {
  display: none;
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.dot-thought,
.dot-muted {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--wc-text-dim);
  opacity: 0.45;
  position: relative;
  z-index: 1;
}

.dot-muted {
  opacity: 0.3;
}

.expand-btn {
  padding: 0;
  border: none;
  background: none;
  color: var(--wc-accent, #3794ff);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  opacity: 0.9;
}

.expand-btn:hover {
  opacity: 1;
  text-decoration: underline;
}

.stream-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  line-height: 1.65;
}

.stream-row.clickable {
  cursor: pointer;
}

.stream-row.clickable:hover {
  opacity: 0.88;
}

.row-chevron {
  flex-shrink: 0;
  margin-left: 2px;
  color: var(--wc-text-dim);
  font-size: 11px;
  opacity: 0.7;
}

.step-detail {
  margin: 4px 0 0;
  padding: 0;
  max-height: 200px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--wc-text-dim);
}

.bash-io-block {
  margin: 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow: auto;
}

.bash-io-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid color-mix(in srgb, var(--wc-border) 80%, transparent);
  background: color-mix(in srgb, var(--wc-input-bg) 30%, transparent);
}

.io-label {
  flex-shrink: 0;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.03em;
  color: var(--wc-text-dim);
  opacity: 0.8;
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
  color: var(--wc-text-muted);
}

.stream-row.error .indicator-char {
  color: #c45c5c;
}

.row-indicator {
  width: 9px;
  height: 9px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.indicator-char {
  font-size: 10px;
  line-height: 1;
  color: var(--wc-text-dim);
}

.dot {
  display: block;
  flex-shrink: 0;
}

.dot-done {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #3d9a5f;
}

.timeline-marker :deep(.agent-spinner-glyph),
.row-indicator :deep(.agent-spinner-glyph) {
  width: 9px;
  height: 9px;
  font-size: 9px;
  position: relative;
  z-index: 1;
}

.row-primary {
  flex-shrink: 0;
  font-weight: 400;
  font-size: 13px;
  color: var(--wc-text);
}

.row-secondary {
  min-width: 0;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 400;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--wc-text-dim);
}

.row-secondary {
  margin: 6px 0 0;
  padding: 0;
  max-height: 160px;
  overflow-y: auto;
  overflow-anchor: none;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.5;
  color: var(--wc-text-dim);
}
</style>

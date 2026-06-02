<script setup lang="ts">
import { computed, ref } from 'vue'
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
}>()

const expanded = ref(false)

const displayHeadline = computed(() => {
  if (props.agentMode && props.steps.length) return activeProgressHeadline(props.steps)
  return props.fallbackHeadline ?? 'Working…'
})

const sliced = computed(() =>
  sliceProgressStepsForDisplay(props.steps, expanded.value),
)
const visibleSteps = computed(() => sliced.value.visible)
const hiddenCount = computed(() => sliced.value.hiddenCount)

const glyphForStep = (step: AgentProgressStep) => {
  if (step.status === 'error') return '✗'
  if (step.status === 'done') return '✓'
  if (step.phase === 'model') return '◐'
  return '●'
}

const primaryForStep = (step: AgentProgressStep) => {
  if (step.phase === 'tool' && step.toolName) return step.toolName
  if (step.phase === 'model' && step.status === 'active') return 'Thinking'
  if (step.phase === 'model') return 'Thought'
  return step.label
}

const secondaryForStep = (step: AgentProgressStep) => {
  if (step.phase === 'tool' && step.summary) return step.summary
  if (step.phase === 'model' && step.status === 'done') return `turn ${step.turn}`
  return ''
}

const subagentGlyph = (status: SubagentTaskView['status']) => {
  if (status === 'completed') return '✓'
  if (status === 'failed' || status === 'stopped') return '✗'
  return '●'
}
</script>

<template>
  <div class="agent-progress-stream">
    <div class="stream-headline" :class="{ shimmer: agentMode && steps.some((s) => s.status === 'active') }">
      <span class="headline-glyph" aria-hidden="true">›</span>
      <span class="headline-text">{{ displayHeadline }}</span>
    </div>

    <div v-if="agentMode && hiddenCount > 0" class="stream-expand">
      <button type="button" class="expand-btn" @click="expanded = true">
        展开 {{ hiddenCount }} 项已完成步骤
      </button>
    </div>

    <div v-if="agentMode && visibleSteps.length" class="stream-rows">
      <div
        v-for="step in visibleSteps"
        :key="step.id"
        class="stream-row"
        :class="[step.phase, step.status]"
      >
        <span class="row-glyph" :class="step.status">{{ glyphForStep(step) }}</span>
        <span class="row-primary">{{ primaryForStep(step) }}</span>
        <span v-if="secondaryForStep(step)" class="row-secondary">{{ secondaryForStep(step) }}</span>
      </div>
    </div>

    <div v-if="agentMode && subagentTasks.length" class="stream-rows subagent-rows">
      <div
        v-for="task in subagentTasks"
        :key="task.id"
        class="stream-row subagent"
        :class="task.status"
      >
        <span class="row-glyph" :class="task.status">{{ subagentGlyph(task.status) }}</span>
        <span class="row-primary">Task</span>
        <span class="row-secondary">{{ task.description }}</span>
      </div>
    </div>

    <div v-if="streamText.trim()" class="reasoning-block">
      <pre class="reasoning-text">{{ streamText }}</pre>
    </div>
  </div>
</template>

<style scoped>
.agent-progress-stream {
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  line-height: 1.45;
  color: var(--wc-text-dim);
  background: var(--wc-chat-box-bg, var(--wc-input-bg));
  border-radius: 8px;
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--wc-border);
  padding: 10px 12px;
  max-width: 100%;
}

.stream-headline {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--wc-text);
  font-size: 12px;
  margin-bottom: 6px;
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
  color: var(--wc-accent, #7aa2f7);
  font-weight: 600;
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
  gap: 3px;
}

.stream-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  min-width: 0;
}

.stream-row.active .row-glyph {
  color: var(--wc-accent, #7aa2f7);
  animation: glyph-pulse 0.9s ease-in-out infinite;
}

.stream-row.done .row-glyph {
  color: #3d9a5f;
}

.stream-row.error .row-glyph {
  color: #c45c5c;
}

.stream-row.tool.active .row-primary {
  color: var(--wc-accent, #7aa2f7);
}

@keyframes glyph-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}

.row-glyph {
  width: 12px;
  flex-shrink: 0;
  text-align: center;
}

.row-primary {
  flex-shrink: 0;
  font-weight: 600;
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
  font-family: inherit;
  font-size: 11px;
  line-height: 1.5;
  color: var(--wc-text-dim);
}
</style>

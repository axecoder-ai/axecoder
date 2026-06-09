<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '../../i18n'
import AiMetricsPanel from './AiMetricsPanel.vue'
import AiTracePanel from './AiTracePanel.vue'
import TerminalView from './TerminalView.vue'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  height: number
  projectRoot: string
  appTheme?: import('../../types/axecoder').AppTheme
  initialTab?: 'terminal' | 'output' | 'problems' | 'metrics' | 'trace'
  metricsDetached?: boolean
  traceDetached?: boolean
}>()

const tab = ref<'terminal' | 'output' | 'problems' | 'metrics' | 'trace'>('terminal')
const traceFilterModelId = ref('')
const outputLog = ref<string[]>([])
const problems = ref<{ message: string }[]>([])

const addOutput = (msg: string) => {
  outputLog.value = [...outputLog.value.slice(-199), msg]
}

const setProblems = (list: { message: string }[]) => {
  problems.value = list
}

watch(
  () => props.initialTab,
  (v) => {
    if (v) tab.value = v
  },
  { immediate: true },
)

watch(
  () => props.metricsDetached,
  (detached) => {
    if (detached && tab.value === 'metrics') tab.value = 'terminal'
  },
)

watch(
  () => props.traceDetached,
  (detached) => {
    if (detached && tab.value === 'trace') tab.value = 'terminal'
  },
)

const onOpenTraceFromMetrics = (modelId: string) => {
  traceFilterModelId.value = modelId
  tab.value = 'trace'
}

defineExpose({ addOutput, setProblems, tab })

defineEmits<{
  metricsDetach: []
  traceDetach: []
  collapse: []
}>()
</script>

<template>
  <section
    v-show="visible"
    class="bottom-panel"
    :style="{ height: `${height}px` }"
  >
    <div class="panel-tabs">
      <button type="button" :class="{ active: tab === 'terminal' }" @click="tab = 'terminal'">Terminal</button>
      <button type="button" :class="{ active: tab === 'output' }" @click="tab = 'output'">Output</button>
      <button type="button" :class="{ active: tab === 'problems' }" @click="tab = 'problems'">
        Problems
        <span v-if="problems.length" class="badge">{{ problems.length }}</span>
      </button>
      <button
        v-if="!metricsDetached"
        type="button"
        :class="{ active: tab === 'metrics' }"
        @click="tab = 'metrics'"
      >
        {{ t('metrics.tab') }}
      </button>
      <button
        v-if="!traceDetached"
        type="button"
        :class="{ active: tab === 'trace' }"
        @click="tab = 'trace'"
      >
        {{ t('trace.tab') }}
      </button>
      <span class="panel-tabs-spacer" />
      <button
        v-if="tab === 'metrics' && !metricsDetached"
        type="button"
        class="panel-action-btn"
        :title="t('metrics.detach')"
        @click="$emit('metricsDetach')"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3.5 3.5A.5.5 0 0 1 4 3h4.5a.5.5 0 0 1 .5.5V6h1V3.5A1.5 1.5 0 0 0 8.5 2H4a1.5 1.5 0 0 0-1.5 1.5V11a1.5 1.5 0 0 0 1.5 1.5H11a1.5 1.5 0 0 0 1.5-1.5V10h-1v1.5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3.5z"
          />
          <path fill="currentColor" d="M13 6.5v6h-6V6.5h6m1-1h-8v8h8V5.5" />
        </svg>
      </button>
      <button
        v-if="tab === 'trace' && !traceDetached"
        type="button"
        class="panel-action-btn"
        :title="t('trace.detach')"
        @click="$emit('traceDetach')"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3.5 3.5A.5.5 0 0 1 4 3h4.5a.5.5 0 0 1 .5.5V6h1V3.5A1.5 1.5 0 0 0 8.5 2H4a1.5 1.5 0 0 0-1.5 1.5V11a1.5 1.5 0 0 0 1.5 1.5H11a1.5 1.5 0 0 0 1.5-1.5V10h-1v1.5a.5.5 0 0 1-.5.5H4a.5.5 0 0 1-.5-.5V3.5z"
          />
          <path fill="currentColor" d="M13 6.5v6h-6V6.5h6m1-1h-8v8h8V5.5" />
        </svg>
      </button>
      <button
        type="button"
        class="panel-action-btn"
        :title="t('bottom.collapse')"
        @click="$emit('collapse')"
      >
        <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
          <path fill="currentColor" d="M3.5 6 8 10.5 12.5 6H3.5z" />
        </svg>
      </button>
    </div>
    <div v-show="tab === 'terminal'" class="panel-content terminal">
      <TerminalView
        :project-root="projectRoot"
        :active="visible && tab === 'terminal'"
        :app-theme="appTheme"
      />
    </div>
    <div v-show="tab === 'output'" class="panel-content">
      <div v-if="!outputLog.length" class="empty">No output yet</div>
      <pre v-for="(line, i) in outputLog" :key="i" class="log-line">{{ line }}</pre>
    </div>
    <div v-show="tab === 'problems'" class="panel-content">
      <div v-if="!problems.length" class="empty">No problems found</div>
      <ul v-else class="problem-list">
        <li v-for="(p, i) in problems" :key="i">{{ p.message }}</li>
      </ul>
    </div>
    <div v-show="tab === 'metrics' && !metricsDetached" class="panel-content metrics-content">
      <AiMetricsPanel @open-trace="onOpenTraceFromMetrics" />
    </div>
    <div v-show="tab === 'trace' && !traceDetached" class="panel-content trace-content">
      <AiTracePanel :filter-model-id="traceFilterModelId" show-detach-controls @detach="$emit('traceDetach')" />
    </div>
  </section>
</template>

<style scoped>
.bottom-panel {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--wc-panel);
}

.panel-tabs {
  display: flex;
  align-items: center;
  height: 28px;
  background: var(--wc-bg-dark);
  border-bottom: 1px solid var(--wc-border);
}

.panel-tabs-spacer {
  flex: 1;
}

.panel-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--wc-text-muted);
  flex-shrink: 0;
  cursor: pointer;
}

.panel-action-btn:hover {
  color: var(--wc-text);
  background: var(--wc-hover);
}

.panel-action-btn svg {
  display: block;
  flex-shrink: 0;
}

.panel-tabs button {
  padding: 0 14px;
  font-size: 11px;
  color: var(--wc-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-tabs button.active {
  color: var(--wc-text);
  background: var(--wc-panel);
  border-top: 1px solid var(--wc-accent);
}

.badge {
  background: var(--wc-accent);
  color: #fff;
  font-size: 10px;
  padding: 0 5px;
  border-radius: 8px;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 8px 12px;
  font-size: 12px;
  font-family: var(--wc-font-mono);
}

.terminal {
  padding: 0;
  overflow: hidden;
}

.empty {
  color: var(--wc-text-muted);
}

.log-line {
  margin: 0 0 4px;
  white-space: pre-wrap;
}

.problem-list {
  list-style: none;
}

.problem-list li {
  padding: 4px 0;
  color: #f48771;
}

.metrics-content,
.trace-content {
  padding: 6px 8px;
  font-family: inherit;
  overflow: hidden;
}
</style>

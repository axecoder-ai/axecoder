<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue'
import { useI18n } from '../../i18n'
import AiMetricsPanel from './AiMetricsPanel.vue'
import AiTracePanel from './AiTracePanel.vue'
import TerminalView from './TerminalView.vue'
import type { ProblemItem } from '../../types/axecoder'

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

const emit = defineEmits<{
  metricsDetach: []
  traceDetach: []
  collapse: []
  openProblem: [item: ProblemItem]
}>()

const tab = ref<'terminal' | 'output' | 'problems' | 'metrics' | 'trace'>('terminal')
const traceFilterModelId = ref('')
const outputLog = ref<string[]>([])
const outputChannels = ref<string[]>(['AxeCoder'])
const outputChannel = ref('AxeCoder')
const problems = ref<ProblemItem[]>([])
const outputEl = ref<HTMLElement | null>(null)

const problemCounts = computed(() => {
  let errors = 0
  let warnings = 0
  for (const p of problems.value) {
    if (p.severity === 'error') errors++
    else if (p.severity === 'warning') warnings++
  }
  return { errors, warnings, total: problems.value.length }
})

const scrollOutput = () => {
  nextTick(() => {
    if (outputEl.value) outputEl.value.scrollTop = outputEl.value.scrollHeight
  })
}

const loadOutputChannels = async () => {
  const res = await window.axecoder.outputListChannels()
  if (res.ok && res.channels.length) {
    outputChannels.value = res.channels
    if (!outputChannels.value.includes(outputChannel.value)) {
      outputChannel.value = outputChannels.value[0]!
    }
  }
}

const loadOutputLines = async () => {
  const res = await window.axecoder.outputGetLines(outputChannel.value)
  if (res.ok) outputLog.value = res.lines
  scrollOutput()
}

const clearOutputChannel = async () => {
  await window.axecoder.outputClear(outputChannel.value)
  await loadOutputLines()
}

const addOutput = (msg: string, channel = 'AxeCoder') => {
  if (channel === outputChannel.value) {
    outputLog.value = [...outputLog.value.slice(-499), msg]
    scrollOutput()
  }
}

const setProblems = (list: ProblemItem[]) => {
  problems.value = list
}

const switchTab = (name: typeof tab.value) => {
  tab.value = name
}

const sevClass = (s: ProblemItem['severity']) => {
  if (s === 'error') return 'sev-error'
  if (s === 'warning') return 'sev-warn'
  return 'sev-info'
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

watch(outputChannel, () => {
  void loadOutputLines()
})

const onOpenTraceFromMetrics = (modelId: string) => {
  traceFilterModelId.value = modelId
  tab.value = 'trace'
}

let offOutput: (() => void) | undefined

watch(
  () => props.visible,
  (v) => {
    if (v) {
      void loadOutputChannels()
      void loadOutputLines()
      offOutput?.()
      offOutput = window.axecoder.onOutputUpdated(({ channel, line }) => {
        if (!outputChannels.value.includes(channel)) {
          outputChannels.value = [...outputChannels.value, channel]
        }
        addOutput(line, channel)
      })
    } else {
      offOutput?.()
      offOutput = undefined
    }
  },
  { immediate: true },
)

defineExpose({ addOutput, setProblems, tab, switchTab, problemCounts })
</script>

<template>
  <section v-show="visible" class="bottom-panel" :style="{ height: `${height}px` }">
    <div class="panel-tabs">
      <button type="button" :class="{ active: tab === 'terminal' }" @click="tab = 'terminal'">Terminal</button>
      <button type="button" :class="{ active: tab === 'output' }" @click="tab = 'output'">Output</button>
      <button type="button" :class="{ active: tab === 'problems' }" @click="tab = 'problems'">
        Problems
        <span v-if="problemCounts.total" class="badge">{{ problemCounts.total }}</span>
      </button>
      <button v-if="!metricsDetached" type="button" :class="{ active: tab === 'metrics' }" @click="tab = 'metrics'">
        {{ t('metrics.tab') }}
      </button>
      <button v-if="!traceDetached" type="button" :class="{ active: tab === 'trace' }" @click="tab = 'trace'">
        {{ t('trace.tab') }}
      </button>
      <span class="panel-tabs-spacer" />
      <button
        v-if="tab === 'metrics' && !metricsDetached"
        type="button"
        class="panel-action-btn"
        :title="t('metrics.detach')"
        :aria-label="t('metrics.detach')"
        @click="$emit('metricsDetach')"
      >
        <span class="codicon codicon-link-external" aria-hidden="true" />
      </button>
      <button
        v-if="tab === 'trace' && !traceDetached"
        type="button"
        class="panel-action-btn"
        :title="t('trace.detach')"
        :aria-label="t('trace.detach')"
        @click="$emit('traceDetach')"
      >
        <span class="codicon codicon-link-external" aria-hidden="true" />
      </button>
      <button
        type="button"
        class="panel-action-btn panel-close-btn"
        :title="t('bottom.close')"
        :aria-label="t('bottom.close')"
        @click="$emit('collapse')"
      >
        <span class="codicon codicon-close" aria-hidden="true" />
      </button>
    </div>
    <div v-show="tab === 'terminal'" class="panel-content terminal">
      <TerminalView :project-root="projectRoot" :active="visible && tab === 'terminal'" :app-theme="appTheme" />
    </div>
    <div v-show="tab === 'output'" class="panel-content output-wrap">
      <div class="output-toolbar">
        <select v-model="outputChannel" class="channel-select">
          <option v-for="ch in outputChannels" :key="ch" :value="ch">{{ ch }}</option>
        </select>
        <button type="button" class="tb-clear" @click="clearOutputChannel">Clear</button>
      </div>
      <div ref="outputEl" class="output-scroll">
        <div v-if="!outputLog.length" class="empty">No output yet</div>
        <pre v-for="(line, i) in outputLog" :key="i" class="log-line">{{ line }}</pre>
      </div>
    </div>
    <div v-show="tab === 'problems'" class="panel-content">
      <div v-if="!problems.length" class="empty">No problems found</div>
      <ul v-else class="problem-list">
        <li v-for="(p, i) in problems" :key="i" :class="sevClass(p.severity)" @click="emit('openProblem', p)">
          <span class="p-file">{{ p.file.split(/[/\\]/).pop() }}</span>
          <span class="p-loc">[{{ p.line }}, {{ p.col }}]</span>
          <span class="p-msg">{{ p.message }}</span>
        </li>
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
.bottom-panel { flex-shrink: 0; display: flex; flex-direction: column; background: var(--wc-panel); }
.panel-tabs { display: flex; align-items: center; height: 28px; background: var(--wc-bg-dark); border-bottom: 1px solid var(--wc-border); }
.panel-tabs-spacer { flex: 1; }
.panel-action-btn { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: none; background: transparent; color: var(--wc-text-muted); cursor: pointer; }
.panel-action-btn:hover { color: var(--wc-text); background: var(--wc-hover); }
.panel-action-btn .codicon { font-size: 14px; }
.panel-close-btn .codicon { font-size: 16px; }
.panel-tabs button { padding: 0 14px; font-size: 11px; color: var(--wc-text-muted); display: flex; align-items: center; gap: 6px; }
.panel-tabs button.active { color: var(--wc-text); background: var(--wc-panel); border-top: 1px solid var(--wc-accent); }
.badge { background: var(--wc-accent); color: #fff; font-size: 10px; padding: 0 5px; border-radius: 8px; }
.panel-content { flex: 1; overflow: auto; padding: 8px 12px; font-size: 12px; font-family: var(--wc-font-mono); }
.terminal { padding: 0; overflow: hidden; }
.output-wrap { display: flex; flex-direction: column; padding: 0; overflow: hidden; }
.output-toolbar { display: flex; gap: 8px; padding: 4px 8px; border-bottom: 1px solid var(--wc-border); align-items: center; }
.channel-select { font-size: 11px; padding: 2px 6px; background: var(--wc-bg); color: var(--wc-text); border: 1px solid var(--wc-border); border-radius: 4px; }
.tb-clear { font-size: 11px; padding: 2px 8px; background: var(--wc-hover); border-radius: 4px; }
.output-scroll { flex: 1; overflow: auto; padding: 8px 12px; }
.empty { color: var(--wc-text-muted); }
.log-line { margin: 0 0 4px; white-space: pre-wrap; }
.problem-list { list-style: none; }
.problem-list li { padding: 4px 0; cursor: pointer; display: flex; gap: 8px; align-items: baseline; }
.problem-list li:hover { background: var(--wc-hover); }
.sev-error .p-msg { color: #f48771; }
.sev-warn .p-msg { color: #cca700; }
.p-file { flex-shrink: 0; color: var(--wc-accent); }
.p-loc { flex-shrink: 0; opacity: 0.7; }
.metrics-content, .trace-content { padding: 6px 8px; font-family: inherit; overflow: hidden; }
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from '../../i18n'
import type { AiTraceEvent, AiTraceState } from '../../types/axecoder'

const props = defineProps<{
  expanded?: boolean
  detached?: boolean
  showDetachControls?: boolean
  filterModelId?: string
}>()

const emit = defineEmits<{ detach: []; dock: [] }>()

const { t } = useI18n()
const state = ref<AiTraceState>({ recording: false, events: [], eventCount: 0 })
const expandedId = ref('')
const listEl = ref<HTMLElement | null>(null)
const saveMsg = ref('')

let offTrace: (() => void) | undefined

const eventsNewestFirst = computed(() => {
  let rows = [...state.value.events]
  const id = props.filterModelId?.trim()
  if (id) rows = rows.filter((ev) => ev.modelId === id)
  return rows.reverse()
})

const kindLabel = (k: AiTraceEvent['kind']) => {
  if (k === 'model_call') return t('trace.kindModel')
  if (k === 'tool_call') return t('trace.kindToolCall')
  return t('trace.kindToolResult')
}

const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('zh-CN', { hour12: false, minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 })

const unescapeText = (s: string) => s.replace(/\\n/g, '\n').replace(/\\t/g, '\t')

const formatMessageArray = (rows: unknown[]): string => {
  const out: string[] = []
  for (const item of rows) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const role = String(row.role ?? '?').toUpperCase()
    out.push(`──── ${role} ────`)
    if (typeof row.content === 'string') {
      out.push(unescapeText(row.content))
    } else if (row.content !== undefined) {
      out.push(JSON.stringify(row.content, null, 2))
    }
    if (row.reasoning_content) out.push(`[reasoning]\n${unescapeText(String(row.reasoning_content))}`)
    if (row.tool_calls) out.push(`[tool_calls]\n${JSON.stringify(row.tool_calls, null, 2)}`)
    out.push('')
  }
  return out.join('\n').trim()
}

const formatTraceContent = (raw?: string): string => {
  if (!raw?.trim()) return ''
  try {
    const data = JSON.parse(raw) as unknown
    if (Array.isArray(data)) return formatMessageArray(data)
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>
      if (obj.error) return `❌ ${String(obj.error)}`
      const chunks: string[] = []
      if (typeof obj.text === 'string' && obj.text.trim()) chunks.push(unescapeText(obj.text))
      else if (typeof obj.content === 'string' && obj.content.trim()) chunks.push(unescapeText(obj.content))
      if (obj.reasoningContent) chunks.push(`── reasoning ──\n${unescapeText(String(obj.reasoningContent))}`)
      if (obj.toolCalls) chunks.push(`── tool_calls ──\n${JSON.stringify(obj.toolCalls, null, 2)}`)
      if (chunks.length) return chunks.join('\n\n')
      return JSON.stringify(data, null, 2)
    }
    return String(data)
  } catch {
    return unescapeText(raw)
  }
}

const eventPreview = (ev: AiTraceEvent): string => {
  const text = formatTraceContent(ev.response ?? ev.request ?? ev.detail)
  return text.replace(/\s+/g, ' ').trim()
}

const loadState = async () => {
  state.value = await window.axecoder.getAiTraceState()
  await nextTick()
  if (listEl.value && state.value.recording) {
    listEl.value.scrollTop = 0
  }
}

const toggleRecording = async () => {
  state.value = await window.axecoder.setAiTraceRecording(!state.value.recording)
}

const onClear = async () => {
  saveMsg.value = ''
  state.value = await window.axecoder.clearAiTrace()
}

const onSave = async () => {
  saveMsg.value = ''
  const res = await window.axecoder.saveAiTrace()
  if (res.ok) saveMsg.value = t('trace.savedTo', { path: res.path })
  else saveMsg.value = res.error
}

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? '' : id
}

const onDetach = () => {
  emit('detach')
  void window.axecoder.openTraceWindow()
}

const onDock = () => {
  void window.axecoder.closeTraceWindow()
  emit('dock')
}

onMounted(async () => {
  await loadState()
  offTrace = window.axecoder.onAiTraceUpdate((s) => {
    state.value = s
    void nextTick(() => {
      if (listEl.value && s.recording) listEl.value.scrollTop = 0
    })
  })
})

onUnmounted(() => {
  offTrace?.()
})
</script>

<template>
  <div class="trace-root" :class="{ expanded }">
    <div class="trace-toolbar">
      <button
        type="button"
        class="rec-btn"
        :class="{ on: state.recording }"
        @click="toggleRecording"
      >
        {{ state.recording ? t('trace.stop') : t('trace.start') }}
      </button>
      <button type="button" class="tb-btn" :disabled="!state.eventCount" @click="onSave">
        {{ t('trace.save') }}
      </button>
      <button type="button" class="tb-btn" :disabled="!state.eventCount" @click="onClear">
        {{ t('trace.clear') }}
      </button>
      <span v-if="state.recording" class="rec-dot">● {{ t('trace.recording') }}</span>
      <span v-if="saveMsg" class="save-msg">{{ saveMsg }}</span>
      <div v-if="showDetachControls && detached" class="detach-actions">
        <button type="button" class="tb-btn" @click="onDock">{{ t('trace.dock') }}</button>
      </div>
    </div>

    <div ref="listEl" class="trace-list">
      <div v-if="!eventsNewestFirst.length" class="empty">{{ t('trace.empty') }}</div>
      <article
        v-for="ev in eventsNewestFirst"
        :key="ev.id"
        class="trace-item"
        :class="{ fail: ev.ok === false, [ev.kind]: true }"
      >
        <header class="trace-head" @click="toggleExpand(ev.id)">
          <div class="trace-head-row">
            <span class="kind">{{ kindLabel(ev.kind) }}</span>
            <span v-if="ev.modelName" class="meta">{{ ev.modelName }}</span>
            <span v-if="ev.toolName" class="meta">{{ ev.toolName }}</span>
            <span v-if="ev.sessionId" class="meta sid">#{{ ev.sessionId.slice(0, 8) }}</span>
            <span v-if="ev.turn" class="meta">T{{ ev.turn }}</span>
            <span class="time">{{ fmtTime(ev.ts) }}</span>
            <span v-if="ev.durationMs" class="meta">{{ ev.durationMs }}ms</span>
            <span class="expand-hint">{{ expandedId === ev.id ? '▼' : '▶' }}</span>
          </div>
          <p v-if="eventPreview(ev)" class="trace-preview">{{ eventPreview(ev) }}</p>
        </header>
        <div v-if="expandedId === ev.id" class="trace-body">
          <section v-if="ev.request" class="trace-section">
            <div class="section-title">{{ t('trace.request') }}</div>
            <pre class="block">{{ formatTraceContent(ev.request) }}</pre>
          </section>
          <section v-if="ev.detail" class="trace-section">
            <div class="section-title">{{ t('trace.detail') }}</div>
            <pre class="block">{{ formatTraceContent(ev.detail) }}</pre>
          </section>
          <section v-if="ev.response" class="trace-section">
            <div class="section-title">{{ t('trace.response') }}</div>
            <pre class="block">{{ formatTraceContent(ev.response) }}</pre>
          </section>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.trace-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 6px;
  font-family: var(--wc-font-ui, system-ui, sans-serif);
  color: var(--wc-text);
}

.trace-root.expanded {
  padding: 12px 16px;
  background: var(--wc-bg);
}

.trace-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 11px;
}

.rec-btn {
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid #f48771;
  color: #f48771;
  background: transparent;
  font-weight: 600;
}

.rec-btn.on {
  background: #f48771;
  color: var(--wc-bg-dark);
}

.tb-btn {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--wc-border);
  background: var(--wc-panel);
  color: var(--wc-text);
  font-size: 11px;
}

.tb-btn:hover:not(:disabled) {
  background: var(--wc-hover);
}

.tb-btn:disabled {
  opacity: 0.45;
}

.rec-dot {
  color: #f48771;
  font-size: 10px;
}

.save-msg {
  color: var(--wc-text-muted);
  font-size: 10px;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detach-actions {
  margin-left: auto;
}

.trace-list {
  flex: 1;
  overflow: auto;
  min-height: 0;
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  background: var(--wc-bg-dark);
}

.empty {
  padding: 16px;
  color: var(--wc-text-muted);
  font-size: 11px;
}

.trace-item {
  border-bottom: 1px solid var(--wc-border);
}

.trace-item.fail .trace-head {
  border-left: 3px solid #f48771;
}

.trace-item.model_call .kind {
  color: var(--wc-accent);
}

.trace-item.tool_call .kind {
  color: #dcdcaa;
}

.trace-item.tool_result .kind {
  color: #89d185;
}

.trace-head {
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
}

.trace-head:hover {
  background: var(--wc-hover);
}

.trace-head-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.trace-preview {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--wc-text);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.kind {
  font-weight: 600;
  flex-shrink: 0;
  font-size: 12px;
}

.meta {
  color: var(--wc-text-muted);
  font-size: 11px;
}

.sid {
  font-family: var(--wc-font-mono);
}

.time {
  margin-left: auto;
  color: var(--wc-text-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.expand-hint {
  color: var(--wc-text-dim);
  font-size: 10px;
  margin-left: 4px;
}

.trace-body {
  padding: 4px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.trace-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--wc-accent);
}

.block {
  margin: 0;
  padding: 10px 12px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border-light);
  border-radius: 4px;
  font-size: 12px;
  line-height: 1.65;
  white-space: pre-wrap;
  word-break: break-word;
  font-family: var(--wc-font-mono, ui-monospace, monospace);
  color: var(--wc-text);
  max-height: 280px;
  overflow: auto;
}

.expanded .block {
  max-height: min(480px, 50vh);
  font-size: 13px;
}
</style>

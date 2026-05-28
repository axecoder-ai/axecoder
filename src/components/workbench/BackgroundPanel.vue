<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type {
  BackgroundMaterialCategory,
  BackgroundParameter,
  BackgroundProjectInfo,
} from '../../types/writcraft'
import {
  loadIncludedPathsFromStorage,
  mergeIncludedWithDefaults,
  saveIncludedPathsToStorage,
} from '../../utils/background-materials'
import {
  advanceInitProgress,
  formatInitProgressLogLine,
  INIT_PROGRESS_LABELS,
  normalizeInitProgressPayload,
  type InitProgressStep,
  type BackgroundInitProgressPayload,
} from '../../utils/background-init-progress'
import BackgroundMaterialsIcon from '../icons/BackgroundMaterialsIcon.vue'

const props = defineProps<{
  visible: boolean
  projectRoot: string
}>()

const emit = defineEmits<{
  'open-file': [path: string]
}>()

const categories = ref<BackgroundMaterialCategory[]>([])
const parameters = ref<BackgroundParameter[]>([])
const projectInfo = ref<BackgroundProjectInfo | undefined>(undefined)

const projectField = (value?: string) => (value?.trim() ? value.trim() : '—')

const PROJECT_CARD_MAIN: { key: keyof BackgroundProjectInfo; label: string }[] = [
  { key: 'projectName', label: '项目名' },
  { key: 'projectCode', label: '项目编码' },
  { key: 'purchaser', label: '招商单位' },
  { key: 'projectAmount', label: '项目金额' },
  { key: 'servicePeriod', label: '服务周期' },
  { key: 'bidDeadline', label: '投标截止' },
]

const PROJECT_CARD_MORE: { key: keyof BackgroundProjectInfo; label: string }[] = [
  { key: 'location', label: '地点' },
  { key: 'qualification', label: '资质要求' },
  { key: 'paymentTerms', label: '付款方式' },
  { key: 'warranty', label: '质保售后' },
  { key: 'extra', label: '其他' },
]

const hasProjectMoreContent = computed(() =>
  PROJECT_CARD_MORE.some((row) => projectInfo.value?.[row.key]?.trim()),
)

const displayCategories = computed(() => categories.value.filter((c) => c.id !== 'params'))

const paramContextEntries = computed(() => {
  const cat = categories.value.find((c) => c.id === 'params')
  return cat?.entries ?? []
})

const paramStatusLabel = (status: BackgroundParameter['status']) =>
  status === 'responded' ? '已响应' : '未响应'

const paramKindLabel = (kind: BackgroundParameter['kind']) =>
  kind === 'business' ? '商务' : '技术'
const loading = ref(false)
const initing = ref(false)
const initSteps = ref<InitProgressStep[]>([])
const initAiLog = ref<string[]>([])
const error = ref('')
let initProgressUnsub: (() => void) | null = null
const manifestMissing = ref(false)
const included = ref<Set<string>>(new Set())

const allAiPaths = computed(() => {
  const paths: string[] = []
  for (const cat of categories.value) {
    for (const e of cat.entries) {
      if (e.aiContextAllowed && e.exists) paths.push(e.path)
    }
  }
  return paths
})

const hydrateIncluded = () => {
  if (!props.projectRoot) {
    included.value = new Set()
    return
  }
  const stored = loadIncludedPathsFromStorage(props.projectRoot)
  const merged = mergeIncludedWithDefaults(stored, allAiPaths.value)
  included.value = new Set(merged)
  saveIncludedPathsToStorage(props.projectRoot, merged)
}

const load = async () => {
  if (!props.projectRoot) {
    categories.value = []
    parameters.value = []
    projectInfo.value = undefined
    error.value = '请先打开项目文件夹'
    manifestMissing.value = false
    included.value = new Set()
    return
  }
  loading.value = true
  error.value = ''
  manifestMissing.value = false
  const res = await window.writcraft.readBackgroundMaterials(props.projectRoot)
  loading.value = false
  if (!res.ok) {
    categories.value = []
    parameters.value = []
    projectInfo.value = undefined
    included.value = new Set()
    if (res.code === 'MANIFEST_MISSING') {
      manifestMissing.value = true
      error.value = ''
      return
    }
    error.value = res.error
    return
  }
  categories.value = res.categories
  parameters.value = res.parameters ?? []
  projectInfo.value = res.projectInfo
  hydrateIncluded()
}

const stopInitProgress = () => {
  initProgressUnsub?.()
  initProgressUnsub = null
}

const runInit = async () => {
  if (!props.projectRoot || initing.value) return
  initing.value = true
  error.value = ''
  initSteps.value = []
  initAiLog.value = []
  stopInitProgress()
  initProgressUnsub = window.writcraft.onBackgroundInitProgress((raw) => {
    const payload = normalizeInitProgressPayload(raw) as BackgroundInitProgressPayload
    initSteps.value = advanceInitProgress(initSteps.value, payload)
    const line = formatInitProgressLogLine(payload)
    if (line) {
      if (payload.type === 'ai') initAiLog.value = [...initAiLog.value.slice(-80), line]
      else if (payload.type === 'stage' && payload.status === 'start') {
        initAiLog.value = [...initAiLog.value, line]
      }
    }
  })
  try {
    const models = await window.writcraft.listModels()
    const modelId = models.activeModelId
    if (!modelId?.trim()) {
      error.value = '请先在设置中选择并启用模型'
      return
    }
    const result = await window.writcraft.initBackground(props.projectRoot, modelId)
    if (!result.ok) {
      error.value = result.error
      return
    }
    await load()
  } finally {
    stopInitProgress()
    initing.value = false
  }
}

const initHeadline = computed(() => {
  const active = [...initSteps.value].reverse().find((s) => s.status === 'active')
  return active?.label ?? INIT_PROGRESS_LABELS.scan
})

const toggleEntry = (path: string, allowed: boolean, checked: boolean) => {
  if (!allowed) return
  const next = new Set(included.value)
  if (checked) next.add(path)
  else next.delete(path)
  included.value = next
  if (props.projectRoot) {
    saveIncludedPathsToStorage(props.projectRoot, [...next])
  }
}

const toggleCategory = (cat: BackgroundMaterialCategory, checked: boolean) => {
  const next = new Set(included.value)
  for (const e of cat.entries) {
    if (!e.aiContextAllowed || !e.exists) continue
    if (checked) next.add(e.path)
    else next.delete(e.path)
  }
  included.value = next
  if (props.projectRoot) {
    saveIncludedPathsToStorage(props.projectRoot, [...next])
  }
}

const categoryAllChecked = (cat: BackgroundMaterialCategory) => {
  const eligible = cat.entries.filter((e) => e.aiContextAllowed && e.exists)
  if (!eligible.length) return false
  return eligible.every((e) => included.value.has(e.path))
}

watch(
  () => [props.visible, props.projectRoot] as const,
  () => {
    if (props.visible) void load()
  },
  { immediate: true },
)

defineExpose({ refresh: load })
</script>

<template>
  <aside v-show="visible" class="sidebar-panel">
    <div class="panel-title">
      <BackgroundMaterialsIcon class="panel-title-icon" :size="14" />
      <span>背景资料</span>
      <button
        type="button"
        class="hdr-btn"
        :class="{ 'hdr-btn--busy': initing }"
        title="扫描并初始化背景资料 (/init)"
        :disabled="!projectRoot || initing"
        @click="runInit"
      >
        <svg class="hdr-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M13.2 2.8A6 6 0 1 0 12.8 9" stroke="currentColor" stroke-linecap="round" />
          <path d="M13.2 2.8V6h-3.2" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </button>
    </div>
    <div class="panel-body">
      <div v-if="initing" class="init-progress">
        <div class="init-progress-head">
          <span class="init-pulse" aria-hidden="true" />
          <span>{{ initHeadline }}</span>
        </div>
        <ul v-if="initSteps.length" class="init-steps">
          <li
            v-for="step in initSteps"
            :key="step.id"
            class="init-step"
            :class="step.status"
          >
            <span class="init-dot" />
            <span>{{ step.label }}</span>
          </li>
        </ul>
        <ul v-if="initAiLog.length" class="init-ai-log">
          <li v-for="(line, idx) in initAiLog" :key="idx" class="init-ai-line">{{ line }}</li>
        </ul>
        <p class="hint small init-hint">
          识别参数与项目信息，并扫描技术方案对照是否已响应参数，请勿关闭项目…
        </p>
      </div>
      <div v-else-if="loading" class="hint">加载中…</div>
      <div v-else-if="!projectRoot" class="hint">请先打开项目文件夹</div>
      <div v-else-if="manifestMissing" class="empty-state">
        <p class="hint">尚未配置背景资料</p>
        <p class="hint small">
          在项目根创建 <code>.writcraft/background.json</code>，声明招标文件、参数等参考文件路径。
        </p>
      </div>
      <div v-else-if="error" class="hint error">{{ error }}</div>
      <template v-else>
        <p v-if="allAiPaths.length" class="hint small truncate-hint">
          勾选仅作标记，不会自动带入聊天；请在聊天中拖拽附件，或开启 Agent 用 Glob/Grep 查找。
        </p>
        <div v-if="!categories.length && !parameters.length && !projectInfo" class="hint">
          manifest 中暂无分类
        </div>
        <section class="project-card-section">
          <div class="param-section-title">项目</div>
          <div class="project-card">
            <div
              v-for="row in PROJECT_CARD_MAIN"
              :key="row.key"
              class="project-card-row"
            >
              <span class="project-card-label">{{ row.label }}</span>
              <span class="project-card-value">{{ projectField(projectInfo?.[row.key]) }}</span>
            </div>
            <details class="project-more">
              <summary class="project-more-summary">
                更多
                <span v-if="hasProjectMoreContent" class="project-more-dot" aria-hidden="true" />
              </summary>
              <div class="project-more-body">
                <div
                  v-for="row in PROJECT_CARD_MORE"
                  :key="row.key"
                  class="project-card-row"
                >
                  <span class="project-card-label">{{ row.label }}</span>
                  <span
                    class="project-card-value"
                    :class="{
                      'project-card-extra': row.key === 'extra' || row.key === 'qualification',
                    }"
                  >
                    {{ projectField(projectInfo?.[row.key]) }}
                  </span>
                </div>
              </div>
            </details>
          </div>
          <p class="hint small project-card-hint">
            由 <code>/init</code> 从标书/招标类文件识别；可在 <code>background.json</code> 的
            <code>projectInfo</code> 中修改。
          </p>
        </section>
        <section class="param-section">
          <div class="param-section-title">参数</div>
          <ul v-if="parameters.length" class="param-list">
            <li v-for="p in parameters" :key="`${p.kind ?? 'technical'}-${p.id}`" class="param-row">
              <span class="param-label">{{ p.label }}</span>
              <span class="param-kind">{{ paramKindLabel(p.kind) }}</span>
              <span class="param-title">{{ p.title }}</span>
              <span class="param-status" :class="p.status">（{{ paramStatusLabel(p.status) }}）</span>
            </li>
          </ul>
          <p v-else class="hint small param-empty">
            暂无参数。请执行 <code>/init</code>；将识别技术类与商务类参数（<code>技术参数.md</code>、<code>商务参数.md</code>、<code>参数.md</code> 或对应章节）。
          </p>
          <ul v-if="parameters.length && paramContextEntries.length" class="entry-list param-context-files">
            <li
              v-for="e in paramContextEntries"
              :key="e.path"
              class="entry"
              :class="{ missing: !e.exists, disabled: !e.aiContextAllowed }"
            >
              <input
                type="checkbox"
                class="entry-check"
                :checked="included.has(e.path)"
                :disabled="!e.aiContextAllowed || !e.exists"
                title="带入聊天"
                @change="toggleEntry(e.path, e.aiContextAllowed && e.exists, ($event.target as HTMLInputElement).checked)"
              />
              <button type="button" class="entry-link" @click="emit('open-file', e.path)">
                {{ e.relativePath }}
              </button>
              <span v-if="!e.exists" class="badge">缺失</span>
            </li>
          </ul>
        </section>
        <details v-for="cat in displayCategories" :key="cat.id" class="category" open>
          <summary class="category-head">
            <span>{{ cat.label }}</span>
            <label class="cat-toggle" @click.stop>
              <input
                type="checkbox"
                :checked="categoryAllChecked(cat)"
                @change="toggleCategory(cat, ($event.target as HTMLInputElement).checked)"
              />
              全选
            </label>
          </summary>
          <ul v-if="cat.entries.length" class="entry-list">
            <li
              v-for="e in cat.entries"
              :key="e.path"
              class="entry"
              :class="{ missing: !e.exists, disabled: !e.aiContextAllowed }"
            >
              <input
                type="checkbox"
                class="entry-check"
                :checked="included.has(e.path)"
                :disabled="!e.aiContextAllowed || !e.exists"
                :title="e.aiContextAllowed ? '带入聊天' : 'V1 不支持作为 AI 上下文'"
                @change="toggleEntry(e.path, e.aiContextAllowed && e.exists, ($event.target as HTMLInputElement).checked)"
              />
              <button type="button" class="entry-link" @click="emit('open-file', e.path)">
                {{ e.relativePath }}
              </button>
              <span v-if="!e.exists" class="badge">缺失</span>
            </li>
          </ul>
          <div v-else class="hint small">该分类暂无文件</div>
        </details>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-panel {
  width: 100%;
  background: var(--wc-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
}

.panel-title {
  height: 35px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--wc-text-muted);
  border-bottom: 1px solid var(--wc-border);
  flex-shrink: 0;
}

.panel-title-icon {
  color: inherit;
}

.hdr-btn {
  margin-left: auto;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--wc-text-muted);
  flex-shrink: 0;
}

.hdr-btn:hover:not(:disabled) {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.hdr-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.hdr-btn--busy .hdr-icon {
  animation: hdr-spin 0.85s linear infinite;
}

@keyframes hdr-spin {
  to {
    transform: rotate(360deg);
  }
}

.init-progress {
  padding: 10px 8px;
  border-radius: 6px;
  background: var(--wc-hover, rgba(128, 128, 128, 0.08));
  border: 1px solid var(--wc-border);
}

.init-progress-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  color: var(--wc-text);
}

.init-pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--wc-accent, #4a9eff);
  flex-shrink: 0;
  animation: init-pulse 1s ease-in-out infinite;
}

@keyframes init-pulse {
  0%,
  100% {
    opacity: 0.35;
    transform: scale(0.85);
  }
  50% {
    opacity: 1;
    transform: scale(1.1);
  }
}

.init-steps {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.init-ai-log {
  list-style: none;
  margin: 8px 0 0;
  padding: 8px;
  max-height: 160px;
  overflow-y: auto;
  border-radius: 6px;
  background: var(--wc-bg-subtle, rgba(0, 0, 0, 0.04));
  font-size: 10px;
  line-height: 1.45;
  color: var(--wc-text-dim);
}

.init-ai-line {
  margin: 0;
  padding: 2px 0;
  word-break: break-word;
}

.init-step {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 11px;
  color: var(--wc-text-dim);
  line-height: 1.4;
}

.init-step.active {
  color: var(--wc-text);
}

.init-step.active .init-dot {
  animation: init-dot-blink 0.9s ease-in-out infinite;
}

.init-step.done .init-dot {
  background: #3d9a5f;
}

.init-step.error .init-dot {
  background: #c45c5c;
}

.init-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: var(--wc-text-dim);
}

@keyframes init-dot-blink {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 1;
  }
}

.init-hint {
  margin: 10px 0 0;
  opacity: 0.85;
}

.hdr-icon {
  width: 16px;
  height: 16px;
  display: block;
}

.panel-body {
  flex: 1;
  overflow: auto;
  padding: 8px 12px 12px;
  min-height: 0;
}

.hint {
  font-size: 12px;
  color: var(--wc-text-muted);
  line-height: 1.5;
}

.hint.small {
  font-size: 11px;
  margin-bottom: 8px;
}

.hint.error {
  color: #c45c5c;
}

.truncate-hint {
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--wc-border);
}

.empty-state code {
  font-size: 11px;
  color: var(--wc-text);
}

.category {
  margin-bottom: 8px;
}

.category-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  font-weight: 600;
  color: var(--wc-text);
  cursor: pointer;
  padding: 4px 0;
  list-style: none;
}

.category-head::-webkit-details-marker {
  display: none;
}

.cat-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: normal;
  color: var(--wc-text-muted);
  cursor: pointer;
}

.entry-list {
  list-style: none;
  margin: 0;
  padding: 0 0 0 4px;
}

.entry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 12px;
}

.entry.missing .entry-link {
  color: var(--wc-text-muted);
  text-decoration: line-through;
}

.entry.disabled .entry-link {
  color: var(--wc-text-dim);
}

.entry-check {
  flex-shrink: 0;
}

.entry-link {
  flex: 1;
  text-align: left;
  color: var(--wc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.entry-link:hover {
  color: var(--wc-accent, #4a9eff);
}

.badge {
  font-size: 10px;
  color: #c45c5c;
  flex-shrink: 0;
}

.project-card-section {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--wc-border);
}

.project-card {
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--wc-hover, rgba(128, 128, 128, 0.06));
}

.project-card-row {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  padding: 3px 0;
}

.project-card-label {
  flex-shrink: 0;
  width: 4.5em;
  color: var(--wc-text-muted);
}

.project-card-value {
  flex: 1;
  color: var(--wc-text);
  word-break: break-word;
}

.project-card-extra {
  white-space: pre-wrap;
}

.project-more {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--wc-border);
}

.project-more-summary {
  font-size: 11px;
  font-weight: 600;
  color: var(--wc-text-muted);
  cursor: pointer;
  list-style: none;
  display: flex;
  align-items: center;
  gap: 6px;
  user-select: none;
}

.project-more-summary::-webkit-details-marker {
  display: none;
}

.project-more-summary::before {
  content: '▸';
  font-size: 10px;
  transition: transform 0.15s ease;
}

.project-more[open] .project-more-summary::before {
  transform: rotate(90deg);
}

.project-more-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--wc-accent, #4a9eff);
}

.project-more-body {
  margin-top: 6px;
}

.project-card-hint {
  margin: 8px 0 0;
}

.param-section {
  margin-bottom: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--wc-border);
}

.param-section-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--wc-text);
  margin-bottom: 6px;
}

.param-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.param-row {
  font-size: 12px;
  line-height: 1.5;
  padding: 4px 0;
  color: var(--wc-text);
}

.param-label {
  font-weight: 600;
  margin-right: 4px;
}

.param-kind {
  font-size: 10px;
  color: var(--wc-text-muted);
  margin-right: 4px;
  flex-shrink: 0;
}

.param-title {
  color: var(--wc-text);
}

.param-status {
  color: var(--wc-text-muted);
  flex-shrink: 0;
}

.param-status.responded {
  color: #3d8f5a;
}

.param-status.pending {
  color: #b8860b;
}

.param-empty {
  margin: 0;
}

.param-empty code {
  font-size: 11px;
  color: var(--wc-text);
}

.param-context-files {
  margin-top: 8px;
  padding-top: 6px;
  border-top: 1px dashed var(--wc-border);
}
</style>

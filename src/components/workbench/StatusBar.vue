<script setup lang="ts">
import { ref, watch, onUnmounted, computed } from 'vue'
import { useI18n } from '../../i18n'
import { BY_EXT_FOR_STATUS } from '../../utils/editor-language'

const { t } = useI18n()

const props = defineProps<{
  line: number
  col: number
  language: string
  languageId?: string
  projectName?: string
  projectRoot?: string
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
  eol?: 'LF' | 'CRLF'
  errorCount?: number
  warningCount?: number
}>()

const emit = defineEmits<{
  'show-problems': []
  'language-change': [langId: string]
}>()

const cgLabel = ref('')
let pollTimer: ReturnType<typeof setInterval> | undefined

const langOptions = computed(() =>
  Object.entries(BY_EXT_FOR_STATUS).map(([ext, v]) => ({ id: v.id, label: v.label, ext })),
)

const saveLabel = (s?: string) => {
  if (s === 'saving') return t('status.saving')
  if (s === 'saved') return t('status.saved')
  if (s === 'error') return t('status.saveError')
  return ''
}

const refreshCodeGraphStatus = async () => {
  const root = props.projectRoot?.trim()
  if (!root || !window.axecoder?.codeGraphStatus) {
    cgLabel.value = ''
    return
  }
  const s = await window.axecoder.codeGraphStatus(root)
  if (!s.sqliteAvailable) {
    cgLabel.value = 'CodeGraph unavailable'
    return
  }
  if (!s.engineAvailable) {
    cgLabel.value = 'CodeGraph engine not ready'
    return
  }
  if (s.indexing) {
    cgLabel.value = 'Indexing…'
    return
  }
  if (s.initialized) {
    cgLabel.value = 'Code index ready'
    return
  }
  cgLabel.value = 'Not indexed'
}

const startPoll = () => {
  if (pollTimer) clearInterval(pollTimer)
  if (!props.projectRoot?.trim()) return
  pollTimer = setInterval(() => {
    void refreshCodeGraphStatus()
  }, 2500)
}

watch(
  () => props.projectRoot,
  () => {
    void refreshCodeGraphStatus()
    startPoll()
  },
  { immediate: true },
)

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})

const onCodeGraphIndex = async () => {
  const root = props.projectRoot?.trim()
  if (!root || !window.axecoder?.codeGraphIndex) return
  cgLabel.value = 'Indexing…'
  await window.axecoder.codeGraphIndex(root)
  await refreshCodeGraphStatus()
}

const onLangPick = (e: Event) => {
  const id = (e.target as HTMLSelectElement).value
  emit('language-change', id)
}
</script>

<template>
  <footer class="status-bar">
    <div class="status-left">
      <span v-if="projectName" class="project">{{ projectName }}</span>
      <span v-if="saveLabel(saveStatus)" class="save">{{ saveLabel(saveStatus) }}</span>
      <button
        v-if="(errorCount ?? 0) > 0 || (warningCount ?? 0) > 0"
        type="button"
        class="problems-btn"
        @click="emit('show-problems')"
      >
        <span v-if="errorCount" class="err">{{ errorCount }} ✕</span>
        <span v-if="warningCount" class="warn">{{ warningCount }} ⚠</span>
      </button>
      <button
        v-if="projectRoot && cgLabel"
        type="button"
        class="cg-btn"
        :title="cgLabel === 'Code index ready' ? 'Re-sync code index' : 'Build code index for Agent'"
        @click="onCodeGraphIndex"
      >
        {{ cgLabel }}
      </button>
    </div>
    <div class="status-right">
      <span>AxeCoder</span>
      <span class="sep">|</span>
      <span>Ln {{ line }}, Col {{ col }}</span>
      <span class="sep">|</span>
      <span>{{ eol ?? 'LF' }}</span>
      <span class="sep">|</span>
      <select class="lang-select" :value="languageId ?? 'plaintext'" @change="onLangPick">
        <option v-for="opt in langOptions" :key="opt.id" :value="opt.id">{{ opt.label }}</option>
        <option value="plaintext">Plain Text</option>
      </select>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  height: var(--wc-statusbar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 8px;
  background: var(--wc-status-bg);
  color: #fff;
  font-family: var(--wc-font-sans);
  font-size: var(--wc-font-size-caption);
  flex-shrink: 0;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.problems-btn {
  display: flex;
  gap: 8px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.1);
  font: inherit;
  color: inherit;
  cursor: pointer;
}

.problems-btn .err {
  color: #f48771;
}

.problems-btn .warn {
  color: #cca700;
}

.lang-select {
  background: transparent;
  border: none;
  color: inherit;
  font: inherit;
  cursor: pointer;
}

.lang-select option {
  color: #000;
}

.cg-btn {
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: inherit;
  font: inherit;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
}

.cg-btn:hover {
  background: rgba(255, 255, 255, 0.22);
}

.sep {
  opacity: 0.5;
}

.project {
  opacity: 0.85;
}

.save {
  opacity: 0.75;
}
</style>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useI18n } from '../../i18n'

const { t } = useI18n()

const props = defineProps<{
  line: number
  col: number
  language: string
  projectName?: string
  projectRoot?: string
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
}>()

const cgLabel = ref('')
let pollTimer: ReturnType<typeof setInterval> | undefined

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
    cgLabel.value = 'CodeGraph 不可用'
    return
  }
  if (!s.engineAvailable) {
    cgLabel.value = 'CodeGraph 引擎未就绪'
    return
  }
  if (s.indexing) {
    cgLabel.value = '代码索引中…'
    return
  }
  if (s.initialized) {
    cgLabel.value = '代码索引已就绪'
    return
  }
  cgLabel.value = '未索引'
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
  cgLabel.value = '代码索引中…'
  await window.axecoder.codeGraphIndex(root)
  await refreshCodeGraphStatus()
}
</script>

<template>
  <footer class="status-bar">
    <div class="status-left">
      <span v-if="projectName" class="project">{{ projectName }}</span>
      <span v-if="saveLabel(saveStatus)" class="save">{{ saveLabel(saveStatus) }}</span>
      <button
        v-if="projectRoot && cgLabel"
        type="button"
        class="cg-btn"
        :title="cgLabel === '代码索引已就绪' ? '重新同步代码索引' : '建立代码索引，供 Agent 理解项目结构'"
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
      <span>UTF-8</span>
      <span class="sep">|</span>
      <span>{{ language }}</span>
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

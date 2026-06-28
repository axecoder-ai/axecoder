<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  projectRoot: string
}>()

const emit = defineEmits<{
  openDiff: [file: string, diffText: string]
}>()

const branch = ref('')
const changes = ref<{ code: string; file: string }[]>([])
const error = ref('')
const loading = ref(false)
const commitMessage = ref('')

const refresh = async () => {
  if (!props.projectRoot) {
    branch.value = ''
    changes.value = []
    error.value = 'Open a project first'
    return
  }
  loading.value = true
  error.value = ''
  const res = await window.axecoder.gitStatus(props.projectRoot)
  loading.value = false
  if (!res.ok) {
    error.value = res.error
    branch.value = ''
    changes.value = []
    return
  }
  branch.value = res.branch
  changes.value = res.changes
}

const isStaged = (code: string) => code[0] !== ' ' && code[0] !== '?'

const toggleStage = async (file: string, code: string) => {
  if (!props.projectRoot) return
  if (isStaged(code)) {
    await window.axecoder.gitUnstage(props.projectRoot, file)
  } else {
    await window.axecoder.gitStage(props.projectRoot, file)
  }
  await refresh()
}

const stageAll = async () => {
  if (!props.projectRoot) return
  await window.axecoder.gitStageAll(props.projectRoot)
  await refresh()
}

const commit = async () => {
  if (!props.projectRoot || !commitMessage.value.trim()) return
  const res = await window.axecoder.gitCommit(props.projectRoot, commitMessage.value.trim())
  if (res.ok) {
    commitMessage.value = ''
    await refresh()
  } else {
    error.value = res.error
  }
}

const openDiff = async (file: string) => {
  if (!props.projectRoot) return
  const res = await window.axecoder.gitShow(props.projectRoot, file, false)
  if (res.ok) emit('openDiff', file, res.text)
}

watch(
  () => [props.visible, props.projectRoot] as const,
  () => {
    if (props.visible || props.projectRoot) void refresh()
  },
  { immediate: true },
)

defineExpose({ refresh })
</script>

<template>
  <aside v-show="visible" class="sidebar-panel">
    <div class="panel-title">Source Control</div>
    <div class="panel-body">
      <div v-if="loading" class="hint">Loading…</div>
      <div v-else-if="error" class="hint error">{{ error }}</div>
      <template v-else>
        <div v-if="branch" class="branch">Branch: {{ branch }}</div>
        <div class="commit-row">
          <input v-model="commitMessage" class="commit-input" placeholder="Commit message" />
          <button type="button" class="action-btn" :disabled="!commitMessage.trim()" @click="commit">Commit</button>
        </div>
        <button v-if="changes.length" type="button" class="action-btn secondary" @click="stageAll">Stage All</button>
        <ul v-if="changes.length" class="change-list">
          <li v-for="(c, i) in changes" :key="i">
            <button type="button" class="stage-btn" :title="isStaged(c.code) ? 'Unstage' : 'Stage'" @click="toggleStage(c.file, c.code)">
              {{ isStaged(c.code) ? '−' : '+' }}
            </button>
            <span class="code">{{ c.code.trim() || '?' }}</span>
            <button type="button" class="file-btn" @click="openDiff(c.file)">{{ c.file }}</button>
          </li>
        </ul>
        <div v-else class="hint">Working tree clean</div>
      </template>
      <button type="button" class="refresh-btn" @click="refresh">Refresh</button>
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
  padding: 0 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--wc-text-muted);
  border-bottom: 1px solid var(--wc-border);
  text-transform: uppercase;
}

.panel-body {
  flex: 1;
  overflow: auto;
  padding: 12px;
  font-size: 12px;
}

.branch {
  margin-bottom: 8px;
  color: var(--wc-accent);
}

.commit-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}

.commit-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  background: var(--wc-bg);
  color: var(--wc-text);
  font-size: 12px;
}

.action-btn {
  padding: 6px 10px;
  font-size: 12px;
  background: var(--wc-accent);
  color: #fff;
  border-radius: 4px;
  margin-bottom: 8px;
}

.action-btn.secondary {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.action-btn:disabled {
  opacity: 0.5;
}

.change-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.change-list li {
  display: flex;
  gap: 6px;
  line-height: 1.4;
  align-items: flex-start;
}

.stage-btn {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 3px;
  background: var(--wc-hover);
  font-size: 12px;
  line-height: 1;
}

.code {
  flex-shrink: 0;
  width: 20px;
  color: #e8ab53;
  font-family: var(--wc-font-mono);
}

.file-btn {
  text-align: left;
  word-break: break-all;
  color: var(--wc-text);
}

.file-btn:hover {
  color: var(--wc-accent);
  text-decoration: underline;
}

.hint {
  color: var(--wc-text-muted);
  line-height: 1.5;
}

.hint.error {
  color: #f48771;
}

.refresh-btn {
  margin-top: 12px;
  padding: 6px 12px;
  font-size: 12px;
  background: var(--wc-hover);
  border-radius: 4px;
}

.refresh-btn:hover {
  background: var(--wc-active);
}
</style>

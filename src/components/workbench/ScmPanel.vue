<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  visible: boolean
  projectRoot: string
}>()

const branch = ref('')
const changes = ref<{ code: string; file: string }[]>([])
const error = ref('')
const loading = ref(false)

const refresh = async () => {
  if (!props.projectRoot) {
    branch.value = ''
    changes.value = []
    error.value = '请先打开项目'
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

watch(
  () => [props.visible, props.projectRoot] as const,
  () => {
    if (props.visible) void refresh()
  },
  { immediate: true },
)
</script>

<template>
  <aside v-show="visible" class="sidebar-panel">
    <div class="panel-title">源代码管理</div>
    <div class="panel-body">
      <div v-if="loading" class="hint">加载中…</div>
      <div v-else-if="error" class="hint error">{{ error }}</div>
      <template v-else>
        <div v-if="branch" class="branch">分支：{{ branch }}</div>
        <ul v-if="changes.length" class="change-list">
          <li v-for="(c, i) in changes" :key="i">
            <span class="code">{{ c.code.trim() || '?' }}</span>
            <span class="file">{{ c.file }}</span>
          </li>
        </ul>
        <div v-else class="hint">工作区干净，无未提交变更</div>
      </template>
      <button type="button" class="refresh-btn" @click="refresh">刷新</button>
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
  margin-bottom: 12px;
  color: var(--wc-accent);
}

.change-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.change-list li {
  display: flex;
  gap: 8px;
  line-height: 1.4;
}

.code {
  flex-shrink: 0;
  width: 20px;
  color: #e8ab53;
  font-family: var(--wc-font-mono);
}

.file {
  word-break: break-all;
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

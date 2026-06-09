<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import {
  hasRunningBackgroundTasks,
  mergeBackgroundTaskSnapshots,
  mergeSubagentProgress,
  type BackgroundTaskView,
} from '../../utils/background-task-state'

const props = defineProps<{
  projectRoot: string
  taskIds: string[]
}>()

const tasks = ref<BackgroundTaskView[]>([])
let offProgress: (() => void) | undefined
let pollTimer: ReturnType<typeof setInterval> | undefined

const glyph = (status: BackgroundTaskView['status']) => {
  if (status === 'completed') return '✓'
  if (status === 'failed' || status === 'stopped') return '✗'
  return '●'
}

const statusLabel = (status: BackgroundTaskView['status']) => {
  if (status === 'completed') return '已完成'
  if (status === 'failed') return '失败'
  if (status === 'stopped') return '已停止'
  return '运行中'
}

const hydrate = async () => {
  const ids = props.taskIds.filter(Boolean)
  if (!ids.length || !props.projectRoot.trim()) {
    tasks.value = []
    return
  }
  const res = await window.axecoder.agentResolveBackgroundTasks(props.projectRoot, ids)
  if (res.ok) {
    tasks.value = mergeBackgroundTaskSnapshots(tasks.value, res.tasks)
  }
}

const stopPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = undefined
  }
}

const syncPoll = () => {
  stopPoll()
  if (!hasRunningBackgroundTasks(tasks.value)) return
  pollTimer = setInterval(() => {
    void hydrate()
  }, 2000)
}

const bindProgress = () => {
  offProgress?.()
  const idSet = new Set(props.taskIds)
  if (!idSet.size) return
  offProgress = window.axecoder.onAgentProgress((payload) => {
    if (payload.kind !== 'subagent' || !idSet.has(payload.taskId)) return
    tasks.value = mergeSubagentProgress(tasks.value, {
      taskId: payload.taskId,
      description: payload.description,
      status: payload.status,
    })
    syncPoll()
  })
}

watch(
  () => [...props.taskIds],
  () => {
    void hydrate().then(() => {
      bindProgress()
      syncPoll()
    })
  },
  { immediate: false },
)

onMounted(() => {
  void hydrate().then(() => {
    bindProgress()
    syncPoll()
  })
})

onUnmounted(() => {
  offProgress?.()
  stopPoll()
})
</script>

<template>
  <div v-if="tasks.length" class="bg-task-card">
    <div class="bg-task-head">后台子任务</div>
    <div v-for="task in tasks" :key="task.id" class="bg-task-row" :class="task.status">
      <span class="bg-task-glyph">{{ glyph(task.status) }}</span>
      <span class="bg-task-status">{{ statusLabel(task.status) }}</span>
      <span class="bg-task-desc">{{ task.description }}</span>
      <span v-if="task.error" class="bg-task-error">{{ task.error }}</span>
    </div>
  </div>
</template>

<style scoped>
.bg-task-card {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--wc-chat-box-bg, var(--wc-input-bg));
  box-shadow: inset 0 0 0 1px var(--wc-border);
  font-size: 11px;
  line-height: 1.45;
  color: var(--wc-text-dim);
}

.bg-task-head {
  font-size: 11px;
  font-weight: 600;
  color: var(--wc-text);
  margin-bottom: 6px;
}

.bg-task-row {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
  padding: 2px 0;
}

.bg-task-row.running .bg-task-glyph {
  color: var(--wc-accent, #7aa2f7);
  animation: bg-task-pulse 1.4s ease-in-out infinite;
}

.bg-task-row.completed .bg-task-glyph {
  color: #3fa66b;
}

.bg-task-row.failed .bg-task-glyph,
.bg-task-row.stopped .bg-task-glyph {
  color: #f48771;
}

.bg-task-status {
  flex-shrink: 0;
  color: var(--wc-text-muted);
}

.bg-task-desc {
  color: var(--wc-text);
  min-width: 0;
  word-break: break-word;
}

.bg-task-error {
  width: 100%;
  color: #f48771;
  font-size: 10px;
}

@keyframes bg-task-pulse {
  0%,
  100% {
    opacity: 0.45;
  }
  50% {
    opacity: 1;
  }
}
</style>

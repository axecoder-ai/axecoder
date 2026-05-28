<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import type { ChatSessionMeta } from '../../types/writcraft'
import {
  groupSessionsByDay,
  sliceGroupItems,
  AGENTS_GROUP_LIMIT,
} from '../../utils/agents-panel'

const props = defineProps<{
  visible: boolean
  width: number
  projectRoot: string
  activeSessionId?: string
}>()

const emit = defineEmits<{
  toggle: []
  selectSession: [id: string]
  deleteSession: [id: string]
  newSession: []
}>()

const sessions = ref<ChatSessionMeta[]>([])
const filter = ref('')
const expandedGroups = ref<Record<string, boolean>>({})

const filtered = computed(() => {
  const q = filter.value.trim().toLowerCase()
  const list = [...sessions.value].sort((a, b) => b.updatedAt - a.updatedAt)
  if (!q) return list
  return list.filter((s) => s.title.toLowerCase().includes(q))
})

const groups = computed(() => groupSessionsByDay(filtered.value))

const displayGroups = computed(() =>
  groups.value.map((g) => {
    const expanded = !!expandedGroups.value[g.key]
    const { visible, hasMore } = sliceGroupItems(g.items, expanded, AGENTS_GROUP_LIMIT)
    return { ...g, visible, hasMore, expanded }
  }),
)

const formatTime = (ts: number) => {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${Math.max(1, mins)} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}

const expandGroup = (key: string) => {
  expandedGroups.value = { ...expandedGroups.value, [key]: true }
}

const load = async () => {
  if (!props.projectRoot.trim()) {
    sessions.value = []
    return
  }
  const res = await window.writcraft.getChatSessions(props.projectRoot)
  sessions.value = res.sessions
}

watch(
  () => props.projectRoot,
  () => {
    void load()
  },
)

onMounted(() => {
  void load()
})

defineExpose({ load })
</script>

<template>
  <aside v-show="visible" class="agents-panel" :style="{ width: `${width}px` }">
    <div class="panel-top">
      <div class="search-row">
        <input v-model="filter" type="text" class="search-agents" placeholder="搜索对话…" />
        <button type="button" class="panel-toggle" title="隐藏 Agents 历史" @click="emit('toggle')">
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <rect x="2.5" y="4.5" width="11" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1" />
            <rect x="10.5" y="5" width="2.5" height="6" rx="0.5" fill="currentColor" />
          </svg>
        </button>
      </div>
      <button type="button" class="new-agent" @click="emit('newSession')">新建对话</button>
    </div>
    <div class="panel-list">
      <div v-if="!filtered.length" class="empty">暂无对话记录</div>
      <template v-else>
        <section v-for="g in displayGroups" :key="g.key" class="agent-group">
          <div class="group-label">{{ g.label }}</div>
          <ul class="agent-list">
            <li
              v-for="s in g.visible"
              :key="s.id"
              class="agent-item"
              :class="{ active: s.id === activeSessionId }"
              @click="emit('selectSession', s.id)"
            >
              <span class="agent-icon" aria-hidden="true">
                <svg
                  v-if="s.id === activeSessionId"
                  viewBox="0 0 16 16"
                  width="16"
                  height="16"
                >
                  <circle cx="8" cy="8" r="5.5" fill="none" stroke="currentColor" stroke-width="1.2" />
                  <path
                    fill="currentColor"
                    d="M8 4.5l.9 1.8 2 .3-1.45 1.4.35 2L8 8.9l-1.8.95.35-2L5.1 6.6l2-.3z"
                  />
                </svg>
                <svg v-else viewBox="0 0 16 16" width="16" height="16">
                  <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" stroke-width="1.2" />
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    d="M5 8.2l2 2 4.2-4.4"
                  />
                </svg>
              </span>
              <div class="agent-text">
                <div class="agent-title">{{ s.title }}</div>
                <div class="agent-sub">{{ formatTime(s.updatedAt) }}</div>
              </div>
              <button
                type="button"
                class="agent-delete"
                title="删除对话"
                aria-label="删除对话"
                @click.stop="emit('deleteSession', s.id)"
              >
                <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
                  <path
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.4"
                    stroke-linecap="round"
                    d="M4 8h8"
                  />
                </svg>
              </button>
            </li>
          </ul>
          <button
            v-if="g.hasMore"
            type="button"
            class="more-link"
            @click="expandGroup(g.key)"
          >
            … 更多
          </button>
        </section>
      </template>
    </div>
  </aside>
</template>

<style scoped>
.agents-panel {
  background: var(--wc-bg-dark);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
}

.panel-top {
  flex-shrink: 0;
  padding: 12px 12px 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.search-agents {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  background: var(--wc-input-bg);
  border-radius: 6px;
  font-size: 12px;
}

.panel-toggle {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--wc-text-muted);
}

.panel-toggle:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.new-agent {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid var(--wc-border-light);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--wc-text);
  background: transparent;
}

.new-agent:hover {
  background: var(--wc-hover);
  border-color: var(--wc-text-muted);
}

.panel-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 4px 12px 12px;
}

.empty {
  font-size: 12px;
  color: var(--wc-text-dim);
  padding-top: 8px;
}

.group-label {
  font-size: 11px;
  font-weight: 500;
  color: var(--wc-text-dim);
  padding: 12px 0 6px;
}

.agent-list {
  list-style: none;
}

.agent-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 6px;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
}

.agent-item:hover {
  background: var(--wc-hover);
}

.agent-item.active {
  background: var(--wc-active);
}

.agent-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  color: var(--wc-text-muted);
}

.agent-item.active .agent-icon {
  color: var(--wc-accent);
}

.agent-text {
  flex: 1;
  min-width: 0;
}

.agent-title {
  font-size: 13px;
  line-height: 1.35;
  color: var(--wc-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.agent-item.active .agent-title {
  font-weight: 600;
}

.agent-sub {
  font-size: 11px;
  color: var(--wc-text-dim);
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more-link {
  display: block;
  width: 100%;
  padding: 6px 6px 2px;
  font-size: 11px;
  color: var(--wc-text-dim);
  text-align: left;
}

.more-link:hover {
  color: var(--wc-text-muted);
}

.agent-delete {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 1px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--wc-text-dim);
  opacity: 0;
  pointer-events: none;
}

.agent-item:hover .agent-delete,
.agent-item.active .agent-delete {
  opacity: 1;
  pointer-events: auto;
}

.agent-delete:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}
</style>

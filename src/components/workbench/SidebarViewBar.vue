<script setup lang="ts">
import BackgroundMaterialsIcon from '../icons/BackgroundMaterialsIcon.vue'

const items = [
  { id: 'explorer', title: '资源管理器' },
  { id: 'search', title: '搜索' },
  { id: 'background', title: '背景资料' },
  { id: 'extensions', title: '扩展' },
] as const

defineProps<{
  active: string
}>()

defineEmits<{
  select: [id: string]
}>()
</script>

<template>
  <nav class="sidebar-view-bar">
    <button
      v-for="item in items"
      :key="item.id"
      type="button"
      class="view-btn"
      :class="{ active: active === item.id }"
      :title="item.title"
      @click="$emit('select', item.id)"
    >
      <svg v-if="item.id === 'explorer'" class="view-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3.5 3h5l1.5 1.5V12a.5.5 0 0 1-.5.5H3.5a.5.5 0 0 1-.5-.5V3.5a.5.5 0 0 1 .5-.5z"
          stroke="currentColor"
        />
        <path
          d="M6 2h5l1.5 1.5V11a.5.5 0 0 1-.5.5H7.5"
          stroke="currentColor"
        />
      </svg>
      <svg v-else-if="item.id === 'search'" class="view-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="4" stroke="currentColor" />
        <path d="M10 10l3.5 3.5" stroke="currentColor" stroke-linecap="round" />
      </svg>
      <BackgroundMaterialsIcon v-else-if="item.id === 'background'" class="view-icon" />
      <svg v-else class="view-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <rect x="2.5" y="2.5" width="4.5" height="4.5" rx="0.5" stroke="currentColor" />
        <rect x="9" y="2.5" width="4.5" height="4.5" rx="0.5" stroke="currentColor" />
        <rect x="2.5" y="9" width="4.5" height="4.5" rx="0.5" stroke="currentColor" />
        <rect x="9" y="9" width="4.5" height="4.5" rx="0.5" stroke="currentColor" />
      </svg>
    </button>
    <button type="button" class="view-btn view-btn-more" title="更多视图" disabled>
      <svg class="view-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M4 6.5l4 3.5 4-3.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </nav>
</template>

<style scoped>
.sidebar-view-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--wc-border);
  background: var(--wc-sidebar);
}

.view-btn {
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: var(--wc-text-muted);
}

.view-btn:hover:not(:disabled) {
  color: var(--wc-text);
  background: var(--wc-hover);
}

.view-btn.active {
  color: var(--wc-text);
  background: var(--wc-active);
}

.view-btn:disabled {
  opacity: 0.45;
  cursor: default;
}

.view-btn-more {
  margin-left: auto;
}

.view-icon {
  width: 16px;
  height: 16px;
  display: block;
  stroke-width: 1;
}
</style>

<script setup lang="ts">
const items = [
  { id: 'explorer', title: 'Explorer' },
  { id: 'search', title: 'Search in project' },
  { id: 'scm', title: 'Source Control' },
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
      <svg v-else-if="item.id === 'scm'" class="view-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="4" cy="4" r="1.5" fill="currentColor" />
        <circle cx="4" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="8" r="1.5" fill="currentColor" />
        <path d="M4 5.5v5M4.5 12h6.5a1.5 1.5 0 0 0 0-3H7.5" stroke="currentColor" />
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

.view-icon {
  width: 16px;
  height: 16px;
  display: block;
  stroke-width: 1;
}
</style>

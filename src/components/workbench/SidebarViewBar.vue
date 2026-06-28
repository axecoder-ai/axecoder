<script setup lang="ts">
const items = [
  { id: 'explorer', title: 'Explorer', icon: 'files' },
  { id: 'search', title: 'Search in project', icon: 'search' },
  { id: 'scm', title: 'Source Control', icon: 'source-control' },
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
      <span class="codicon" :class="`codicon-${item.icon}`" aria-hidden="true" />
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

.view-btn .codicon {
  font-size: 16px;
}
</style>

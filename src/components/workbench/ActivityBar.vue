<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../i18n'

const { t } = useI18n()

const items = computed(() => [
  { id: 'explorer', title: t('activity.explorer') },
  { id: 'search', title: t('activity.search') },
  { id: 'scm', title: t('activity.scm') },
  { id: 'extensions', title: t('activity.extensions') },
])

defineProps<{
  active: string
}>()

defineEmits<{
  select: [id: string]
  openSettings: []
}>()
</script>

<template>
  <nav class="activity-bar">
    <div class="activity-top">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="activity-item"
        :class="{ active: active === item.id }"
        :title="item.title"
        @click="$emit('select', item.id)"
      >
        <span class="activity-icon" :data-icon="item.id" />
      </button>
    </div>
    <button
      type="button"
      class="activity-item account"
      :title="t('common.settings')"
      @click="$emit('openSettings')"
    >
      <span class="activity-icon settings" />
    </button>
  </nav>
</template>

<style scoped>
.activity-bar {
  width: var(--wc-activity-w);
  background: var(--wc-bg-dark);
  border-right: 1px solid var(--wc-border);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  flex-shrink: 0;
}

.activity-top {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.activity-item {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #858585;
  position: relative;
}

.activity-item:hover {
  color: var(--wc-text);
}

.activity-item.active {
  color: var(--wc-text);
}

.activity-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  background: var(--wc-text);
  border-radius: 0 2px 2px 0;
}

.activity-icon {
  width: 24px;
  height: 24px;
  display: block;
  background: currentColor;
  mask-size: contain;
  mask-repeat: no-repeat;
  mask-position: center;
}

.activity-icon[data-icon='explorer'] {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M3 5v14h7v-2H5V7h6V5H3zm10 0v6h8l-3 3 3 3v4h-8v-2h6v-2.17L17.17 15 19 13.17V11h-6V9h8V5h-8z'/%3E%3C/svg%3E");
}

.activity-icon[data-icon='search'] {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z'/%3E%3C/svg%3E");
}

.activity-icon[data-icon='scm'] {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 4.5c1.38 0 2.5 1.12 2.5 2.5 0 .89-.47 1.67-1.17 2.11L15 13.5V16h-2v-2.5l1.67-2.39A2.49 2.49 0 0 0 13.5 9c0-1.38 1.12-2.5 2.5-2.5z'/%3E%3C/svg%3E");
}

.activity-icon.settings {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96a7.05 7.05 0 0 0-1.63-.94l-.36-2.54A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.488.488 0 0 0-.59.22L2.74 8.87c-.12.2-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.14.24.43.32.59.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54c.05.28.27.46.49.46h4c.22 0 .44-.18.49-.46l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96c.18.1.45.02.59-.22l1.92-3.32c.12-.2.08-.47-.12-.61l-2.01-1.58zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z'/%3E%3C/svg%3E");
}

.activity-icon[data-icon='extensions'] {
  mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='black' d='M20.5 11H19V7c0-1.1-.9-2-2-2h-4V3.5C13 2.12 11.88 1 10.5 1S8 2.12 8 3.5V5H4c-1.1 0-2 .9-2 2v3.8h1.5c1.38 0 2.5 1.12 2.5 2.5S4.88 16.3 3.5 16.3H2V20c0 1.1.9 2 2 2h3.8v-1.5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5V22H17c1.1 0 2-.9 2-2v-4h1.5c1.38 0 2.5-1.12 2.5-2.5S21.88 11 20.5 11z'/%3E%3C/svg%3E");
}

</style>

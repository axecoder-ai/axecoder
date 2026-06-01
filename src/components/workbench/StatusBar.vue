<script setup lang="ts">
defineProps<{
  line: number
  col: number
  language: string
  projectName?: string
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error'
}>()

const saveLabel = (s?: string) => {
  if (s === 'saving') return '保存中…'
  if (s === 'saved') return '已保存'
  if (s === 'error') return '保存失败'
  return ''
}
</script>

<template>
  <footer class="status-bar">
    <div class="status-left">
      <span v-if="projectName" class="project">{{ projectName }}</span>
      <span v-if="saveLabel(saveStatus)" class="save">{{ saveLabel(saveStatus) }}</span>
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

.project {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save {
  opacity: 0.85;
}

.sep {
  opacity: 0.6;
}
</style>

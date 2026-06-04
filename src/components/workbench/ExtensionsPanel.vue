<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const builtins = [
  { name: 'Markdown editing', desc: 'Monaco editor + live preview' },
  { name: 'ProjectSearch', desc: 'Full-text search via ripgrep' },
  { name: 'File manager', desc: 'Tree view, new/rename/drag-drop' },
  { name: 'Auto-save', desc: 'Delay configurable in Settings' },
  { name: 'AI assistant', desc: 'Local sessions (configure API for models)' },
]
</script>

<template>
  <aside v-show="visible" class="sidebar-panel">
    <div class="panel-title">Extensions</div>
    <div class="panel-body">
      <p class="hint">AxeCoder built-in features (V1, no third-party extension marketplace）：</p>
      <ul class="ext-list">
        <li v-for="(ext, i) in builtins" :key="i">
          <div class="ext-name">{{ ext.name }}</div>
          <div class="ext-desc">{{ ext.desc }}</div>
        </li>
      </ul>
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
}

.hint {
  font-size: 12px;
  color: var(--wc-text-muted);
  margin-bottom: 12px;
}

.ext-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ext-name {
  font-size: 13px;
  font-weight: 500;
}

.ext-desc {
  font-size: 11px;
  color: var(--wc-text-dim);
  margin-top: 2px;
}
</style>

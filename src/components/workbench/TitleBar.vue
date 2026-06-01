<script setup lang="ts">
import { computed } from 'vue'
import type { WindowLayout } from '../../types/axecoder'

const props = defineProps<{
  primarySidebarVisible: boolean
  aiPanelVisible: boolean
  projectName: string
  windowLayout: WindowLayout
}>()

const titleBarClass = computed(() => {
  if (props.windowLayout.platform !== 'darwin') return ''
  return props.windowLayout.fullscreen ? 'mac-fullscreen' : 'mac-inset'
})

defineEmits<{
  togglePrimarySidebar: []
  toggleAiPanel: []
  openProject: []
  openModelSettings: []
}>()
</script>

<template>
  <header class="title-bar" :class="titleBarClass">
    <div class="title-bar-left">
      <button
        type="button"
        class="icon-btn"
        :class="{ active: primarySidebarVisible }"
        title="显示/隐藏侧边栏"
        @click="$emit('togglePrimarySidebar')"
      >
        <svg class="sidebar-toggle-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" />
          <rect x="3.5" y="4.5" width="3.5" height="7" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
    </div>
    <div class="title-bar-spacer" />
    <button
      type="button"
      class="search-wrap"
      :title="projectName ? `项目：${projectName}` : '点击打开项目文件夹'"
      @click="$emit('openProject')"
    >
      <svg class="icon" viewBox="0 0 16 16" fill="currentColor">
        <path
          d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242.656a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"
        />
      </svg>
      <span class="search-text">{{ projectName || '打开项目' }}</span>
    </button>
    <div class="title-bar-spacer" />
    <div class="title-actions">
      <button
        type="button"
        class="icon-btn"
        :class="{ active: aiPanelVisible }"
        title="显示/隐藏 AI 面板"
        @click="$emit('toggleAiPanel')"
      >
        <svg
          class="chat-toggle-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.65"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path
            d="M6 5.5h11a2 2 0 0 1 2 2v6.5a2 2 0 0 1-2 2h-6.5L5 18.5V7.5a2 2 0 0 1 2-2z"
          />
        </svg>
      </button>
      <button type="button" class="icon-btn" title="设置" @click="$emit('openModelSettings')">
        <svg
          class="title-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.65"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          />
        </svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.title-bar {
  height: var(--wc-titlebar-h);
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--wc-bg-dark);
  border-bottom: 1px solid var(--wc-border);
  -webkit-app-region: drag;
  flex-shrink: 0;
  padding: 0 12px 0 var(--wc-titlebar-pad-left);
}

.title-bar.mac-inset {
  --wc-titlebar-pad-left: var(--wc-titlebar-pad-left-mac);
}

.title-bar.mac-fullscreen {
  --wc-titlebar-pad-left: 12px;
}

.title-bar-left,
.search-wrap,
.title-actions {
  -webkit-app-region: no-drag;
}

.title-bar-left {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.title-bar-spacer {
  flex: 1;
  min-width: 24px;
  -webkit-app-region: drag;
}

.search-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  background: var(--wc-input-bg);
  border-radius: 6px;
  min-width: 200px;
  max-width: 420px;
  width: 36%;
  border: none;
  cursor: pointer;
  color: inherit;
  flex-shrink: 1;
}

.search-wrap:hover {
  background: var(--wc-hover);
}

.search-wrap .icon {
  width: 14px;
  height: 14px;
  color: var(--wc-text-muted);
  flex-shrink: 0;
}

.search-text {
  color: var(--wc-text-muted);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.title-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  color: var(--wc-text-muted);
}

.icon-btn:hover,
.icon-btn.active {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.sidebar-toggle-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.chat-toggle-icon,
.title-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}
</style>

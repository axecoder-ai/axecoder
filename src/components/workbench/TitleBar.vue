<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../i18n'

const { t } = useI18n()
import type { WindowLayout } from '../../types/axecoder'

const props = defineProps<{
  primarySidebarVisible: boolean
  aiPanelVisible: boolean
  projectName: string
  windowLayout: WindowLayout
  companionMode?: boolean
  metricsMode?: boolean
  traceMode?: boolean
  dualWindowActive?: boolean
  bottomPanelVisible?: boolean
  companionLayoutReversed?: boolean
}>()

const titleBarClass = computed(() => {
  if (props.windowLayout.platform !== 'darwin') return ''
  return props.windowLayout.fullscreen ? 'mac-fullscreen' : 'mac-inset'
})

defineEmits<{
  togglePrimarySidebar: []
  toggleAiPanel: []
  toggleDualWindow: []
  toggleCompanionLayout: []
  toggleBottomPanel: []
  openProject: []
  openModelSettings: []
}>()
</script>

<template>
  <header class="title-bar" :class="titleBarClass">
    <div class="title-bar-left">
      <button
        v-if="!companionMode"
        type="button"
        class="icon-btn"
        :class="{ active: primarySidebarVisible }"
        :title="t('titlebar.toggleSidebar')"
        @click="$emit('togglePrimarySidebar')"
      >
        <svg class="sidebar-toggle-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" />
          <rect x="3.5" y="4.5" width="3.5" height="7" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
      </button>
      <span v-if="companionMode" class="companion-label">{{ t('titlebar.companionTitle') }}</span>
      <span v-if="metricsMode" class="companion-label">{{ t('titlebar.metricsTitle') }}</span>
      <span v-if="traceMode" class="companion-label">{{ t('titlebar.traceTitle') }}</span>
    </div>
    <div class="title-bar-spacer" />
    <button
      v-if="!companionMode"
      type="button"
      class="search-wrap"
      :title="projectName ? t('titlebar.projectLabel', { name: projectName }) : t('titlebar.openProjectHint')"
      @click="$emit('openProject')"
    >
      <svg class="icon" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        <path
          d="M2.5 3.5A1.5 1.5 0 0 1 4 2h5l3.5 3.5V12a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 12V3.5zm2 0V6h5V3.5H4.5z"
        />
      </svg>
      <span class="search-text">{{
        projectName ? t('titlebar.projectLabel', { name: projectName }) : t('titlebar.openProject')
      }}</span>
    </button>
    <div class="title-bar-spacer" />
    <div class="title-actions">
      <button
        v-if="companionMode"
        type="button"
        class="icon-btn"
        :class="{ active: companionLayoutReversed }"
        :title="t('titlebar.swapCompanionLayout')"
        @click="$emit('toggleCompanionLayout')"
      >
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
          <path d="M8 7H4l3-3" />
          <path d="M4 7v10" />
          <path d="M16 17h4l-3 3" />
          <path d="M20 17V7" />
          <path d="M10 12h4" />
        </svg>
      </button>
      <button
        v-if="!companionMode && !metricsMode && !traceMode"
        type="button"
        class="icon-btn"
        :class="{ active: bottomPanelVisible }"
        :title="t('titlebar.toggleBottomPanel')"
        @click="$emit('toggleBottomPanel')"
      >
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
          <path d="M3 20h18" />
          <path d="M7 16V9" />
          <path d="M12 16V6" />
          <path d="M17 16v-7" />
        </svg>
      </button>
      <button
        v-if="!companionMode && !metricsMode && !traceMode"
        type="button"
        class="icon-btn"
        :class="{ active: dualWindowActive }"
        :title="dualWindowActive ? t('titlebar.closeDualWindow') : t('titlebar.toggleDualWindow')"
        @click="$emit('toggleDualWindow')"
      >
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
          <rect x="3" y="4" width="8" height="16" rx="1.5" />
          <rect x="13" y="4" width="8" height="16" rx="1.5" />
        </svg>
      </button>
      <button
        v-if="!companionMode && !metricsMode && !traceMode"
        type="button"
        class="icon-btn"
        :class="{ active: aiPanelVisible }"
        :title="t('titlebar.toggleAi')"
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
      <button
        v-if="!companionMode && !metricsMode && !traceMode"
        type="button"
        class="icon-btn"
        :title="t('common.settings')"
        @click="$emit('openModelSettings')"
      >
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

.companion-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--wc-text-muted);
  margin-left: 4px;
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

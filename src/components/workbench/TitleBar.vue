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
        <span
          class="codicon"
          :class="primarySidebarVisible ? 'codicon-layout-sidebar-left' : 'codicon-layout-sidebar-left-off'"
          aria-hidden="true"
        />
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
      <span class="codicon codicon-root-folder project-icon" aria-hidden="true" />
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
        <span class="codicon codicon-arrow-swap" aria-hidden="true" />
      </button>
      <button
        v-if="!companionMode && !metricsMode && !traceMode"
        type="button"
        class="icon-btn"
        :class="{ active: bottomPanelVisible }"
        :title="t('titlebar.toggleBottomPanel')"
        @click="$emit('toggleBottomPanel')"
      >
        <span class="codicon codicon-graph" aria-hidden="true" />
      </button>
      <button
        v-if="!companionMode && !metricsMode && !traceMode"
        type="button"
        class="icon-btn"
        :class="{ active: dualWindowActive }"
        :title="dualWindowActive ? t('titlebar.closeDualWindow') : t('titlebar.toggleDualWindow')"
        @click="$emit('toggleDualWindow')"
      >
        <span class="codicon codicon-layout-sidebar-right" aria-hidden="true" />
      </button>
      <button
        v-if="!companionMode && !metricsMode && !traceMode"
        type="button"
        class="icon-btn"
        :class="{ active: aiPanelVisible }"
        :title="t('titlebar.toggleAi')"
        @click="$emit('toggleAiPanel')"
      >
        <span class="codicon codicon-comment-discussion" aria-hidden="true" />
      </button>
      <button
        v-if="!companionMode && !metricsMode && !traceMode"
        type="button"
        class="icon-btn"
        :title="t('common.settings')"
        @click="$emit('openModelSettings')"
      >
        <span class="codicon codicon-gear" aria-hidden="true" />
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

.search-wrap .project-icon {
  font-size: 14px;
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

.icon-btn .codicon {
  font-size: 16px;
  flex-shrink: 0;
}
</style>

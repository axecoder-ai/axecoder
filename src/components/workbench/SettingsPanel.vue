<script setup lang="ts">
import { ref } from 'vue'
import type { AppSettings } from '../../types/axecoder'
import GeneralTab from './GeneralTab.vue'
import ModelsTab from './ModelsTab.vue'
import UsersTab from './UsersTab.vue'

const props = defineProps<{
  visible: boolean
  settings: AppSettings
}>()

const emit = defineEmits<{
  close: []
  changed: []
  save: [partial: Partial<AppSettings>]
}>()

export type SettingsTabId = 'general' | 'models' | 'users'

const activeTab = ref<SettingsTabId>('general')
const modelsTabRef = ref<InstanceType<typeof ModelsTab> | null>(null)
const usersTabRef = ref<InstanceType<typeof UsersTab> | null>(null)

const openTab = (tab: SettingsTabId) => {
  activeTab.value = tab
}

const onChanged = () => {
  emit('changed')
}

const onGeneralSave = (partial: Partial<AppSettings>) => {
  emit('save', partial)
}

defineExpose({
  openTab,
  reloadModels: () => modelsTabRef.value?.reload(),
  reloadUsers: () => usersTabRef.value?.reload(),
})
</script>

<template>
  <div v-if="visible" class="settings-panel">
    <header class="settings-header">
      <span class="settings-title">设置</span>
      <button type="button" class="close-btn" title="关闭" @click="emit('close')">×</button>
    </header>
    <div class="settings-body">
      <nav class="settings-nav">
        <button
          type="button"
          class="nav-item"
          :class="{ active: activeTab === 'general' }"
          @click="activeTab = 'general'"
        >
          通用
        </button>
        <button
          type="button"
          class="nav-item"
          :class="{ active: activeTab === 'models' }"
          @click="activeTab = 'models'"
        >
          模型
        </button>
        <button
          type="button"
          class="nav-item"
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          用户
        </button>
      </nav>
      <main class="settings-content">
        <GeneralTab
          v-show="activeTab === 'general'"
          :settings="settings"
          @save="onGeneralSave"
        />
        <ModelsTab v-show="activeTab === 'models'" ref="modelsTabRef" @changed="onChanged" />
        <UsersTab v-show="activeTab === 'users'" ref="usersTabRef" @changed="onChanged" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.settings-panel {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: var(--wc-bg);
  display: flex;
  flex-direction: column;
}

.settings-header {
  height: var(--wc-titlebar-h);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 72px;
  border-bottom: 1px solid var(--wc-border);
  background: var(--wc-bg-dark);
  flex-shrink: 0;
}

.settings-title {
  font-size: 13px;
  color: var(--wc-text-muted);
}

.close-btn {
  width: 32px;
  height: 32px;
  font-size: 20px;
  line-height: 1;
  border-radius: 4px;
  color: var(--wc-text-muted);
}

.close-btn:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.settings-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.settings-nav {
  width: 200px;
  flex-shrink: 0;
  border-right: 1px solid var(--wc-border);
  padding: 12px 8px;
  background: var(--wc-bg-dark);
}

.nav-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-size: 13px;
  border-radius: 6px;
  color: var(--wc-text-muted);
}

.nav-item:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.nav-item.active {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.settings-content {
  flex: 1;
  overflow: auto;
  background: var(--wc-panel);
}
</style>

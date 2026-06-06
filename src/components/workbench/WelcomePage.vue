<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from '../../i18n'
import SwitchToggle from './SwitchToggle.vue'

const props = defineProps<{
  recentProjects: string[]
  recentFiles: string[]
  hasProject: boolean
  showOnStartup: boolean
}>()

const emit = defineEmits<{
  'open-project': []
  'open-file': []
  'new-file': []
  'open-project-at': [path: string]
  'open-recent-file': [path: string]
  'update:showOnStartup': [value: boolean]
}>()

const { t } = useI18n()
const localShowOnStartup = ref(props.showOnStartup)
watch(
  () => props.showOnStartup,
  (v) => {
    localShowOnStartup.value = v
  },
)

const onShowOnStartupChange = (v: boolean) => {
  emit('update:showOnStartup', v)
}

const projectName = (p: string) => {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || p
}

const projectParent = (p: string) => {
  const parts = p.replace(/\\/g, '/').split('/')
  parts.pop()
  return parts.join('/') || p
}

const fileName = (p: string) => {
  const parts = p.replace(/\\/g, '/').split('/')
  return parts[parts.length - 1] || p
}
</script>

<template>
  <section class="welcome-page">
    <div class="welcome-hero">
      <h1 class="welcome-brand">AxeCoder</h1>
      <p class="welcome-tagline">{{ t('welcome.tagline') }}</p>
    </div>
    <div class="welcome-columns">
      <div class="welcome-col">
        <h2 class="col-title">{{ t('welcome.start') }}</h2>
        <ul class="action-list">
          <li>
            <button type="button" class="action-link" @click="emit('open-project')">
              <span class="action-icon" aria-hidden="true">📁</span>
              {{ t('welcome.openProject') }}
            </button>
          </li>
          <li>
            <button type="button" class="action-link" @click="emit('open-file')">
              <span class="action-icon" aria-hidden="true">📄</span>
              {{ t('welcome.openFile') }}
            </button>
          </li>
          <li>
            <button
              type="button"
              class="action-link"
              :class="{ disabled: !hasProject }"
              :disabled="!hasProject"
              :title="hasProject ? '' : t('common.openProjectFirst')"
              @click="emit('new-file')"
            >
              <span class="action-icon" aria-hidden="true">✏️</span>
              {{ t('welcome.newFile') }}
            </button>
          </li>
        </ul>
        <h2 class="col-title">{{ t('welcome.recent') }}</h2>
        <ul v-if="recentProjects.length" class="recent-list">
          <li v-for="p in recentProjects" :key="p">
            <button
              type="button"
              class="recent-link"
              :title="p"
              @click="emit('open-project-at', p)"
            >
              <span class="recent-name">{{ projectName(p) }}</span>
              <span class="recent-path">{{ projectParent(p) }}</span>
            </button>
          </li>
        </ul>
        <p v-else class="col-empty">{{ t('welcome.noRecentProjects') }}</p>
      </div>
      <div class="welcome-col">
        <h2 class="col-title">{{ t('welcome.getStarted') }}</h2>
        <ul class="walkthrough-list">
          <li class="walkthrough-card">
            <p class="walkthrough-title">{{ t('welcome.walkFolderTitle') }}</p>
            <p class="walkthrough-desc">{{ t('welcome.walkFolderDesc') }}</p>
          </li>
          <li class="walkthrough-card">
            <p class="walkthrough-title">{{ t('welcome.walkAiTitle') }}</p>
            <p class="walkthrough-desc">{{ t('welcome.walkAiDesc') }}</p>
          </li>
        </ul>
        <template v-if="recentFiles.length">
          <h2 class="col-title">{{ t('welcome.recentFiles') }}</h2>
          <ul class="recent-files-list">
            <li v-for="f in recentFiles.slice(0, 6)" :key="f">
              <button
                type="button"
                class="recent-file-link"
                :title="f"
                @click="emit('open-recent-file', f)"
              >
                {{ fileName(f) }}
              </button>
            </li>
          </ul>
        </template>
      </div>
    </div>
    <label class="welcome-footer">
      <SwitchToggle v-model="localShowOnStartup" @change="onShowOnStartupChange" />
      {{ t('welcome.showOnStartup') }}
    </label>
  </section>
</template>

<style scoped>
/* styles unchanged from original */
.welcome-page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
  min-height: 0;
  height: 100%;
  padding: 48px 56px 0;
  overflow: hidden;
  background: var(--wc-bg);
  color: var(--wc-text);
}

.welcome-hero {
  margin-bottom: 40px;
}

.welcome-brand {
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.welcome-tagline {
  margin: 0;
  font-size: 15px;
  color: var(--wc-text-dim);
}

.welcome-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 48px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-bottom: 16px;
}

.col-title {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--wc-text-muted);
}

.action-list,
.recent-list,
.walkthrough-list,
.recent-files-list {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
}

.action-link,
.recent-link,
.recent-file-link {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--wc-text);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
}

.action-link:hover:not(:disabled),
.recent-link:hover,
.recent-file-link:hover {
  background: var(--wc-hover);
}

.action-link.disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.recent-link {
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.recent-name {
  font-weight: 500;
}

.recent-path {
  font-size: 12px;
  color: var(--wc-text-dim);
}

.col-empty {
  margin: 0 0 24px;
  font-size: 13px;
  color: var(--wc-text-dim);
}

.walkthrough-card {
  margin-bottom: 12px;
  padding: 14px 16px;
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  background: var(--wc-input-bg);
}

.walkthrough-title {
  margin: 0 0 6px;
  font-size: 14px;
  font-weight: 500;
}

.walkthrough-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
  color: var(--wc-text-dim);
}

.welcome-footer {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  margin-top: 0;
  padding: 14px 0 20px;
  border-top: 1px solid var(--wc-border);
  background: var(--wc-bg);
  font-size: 13px;
  color: var(--wc-text-dim);
  cursor: pointer;
}
</style>

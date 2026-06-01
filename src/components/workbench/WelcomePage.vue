<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  recentProjects: string[]
  recentFiles: string[]
  hasProject: boolean
  showOnStartup: boolean
}>()

const emit = defineEmits<{
  'open-project': []
  'open-project-at': [path: string]
  'open-file': []
  'new-file': []
  'open-recent-file': [path: string]
  'update:showOnStartup': [value: boolean]
}>()

const localShowOnStartup = ref(props.showOnStartup)

watch(
  () => props.showOnStartup,
  (v) => {
    localShowOnStartup.value = v
  },
)

const onShowOnStartupChange = () => {
  emit('update:showOnStartup', localShowOnStartup.value)
}

const projectName = (p: string) => {
  const parts = p.replace(/\/$/, '').split(/[/\\]/)
  return parts[parts.length - 1] || p
}

const projectParent = (p: string) => {
  const parts = p.replace(/\/$/, '').split(/[/\\]/)
  parts.pop()
  return parts.join('/') || p
}

const fileName = (p: string) => {
  const parts = p.split(/[/\\]/)
  return parts[parts.length - 1] || p
}
</script>

<template>
  <section class="welcome-page">
    <div class="welcome-hero">
      <h1 class="welcome-brand">AxeCoder</h1>
      <p class="welcome-tagline">代码编写与 AI 协作 IDE</p>
    </div>
    <div class="welcome-columns">
      <div class="welcome-col">
        <h2 class="col-title">启动</h2>
        <ul class="action-list">
          <li>
            <button type="button" class="action-link" @click="emit('open-project')">
              <span class="action-icon" aria-hidden="true">📁</span>
              打开项目…
            </button>
          </li>
          <li>
            <button type="button" class="action-link" @click="emit('open-file')">
              <span class="action-icon" aria-hidden="true">📄</span>
              打开文件…
            </button>
          </li>
          <li>
            <button
              type="button"
              class="action-link"
              :class="{ disabled: !hasProject }"
              :disabled="!hasProject"
              :title="hasProject ? '' : '请先打开项目'"
              @click="emit('new-file')"
            >
              <span class="action-icon" aria-hidden="true">✏️</span>
              新建文件…
            </button>
          </li>
        </ul>
        <h2 class="col-title">最近</h2>
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
        <p v-else class="col-empty">暂无最近项目</p>
      </div>
      <div class="welcome-col">
        <h2 class="col-title">入门</h2>
        <ul class="walkthrough-list">
          <li class="walkthrough-card">
            <p class="walkthrough-title">从文件夹开始</p>
            <p class="walkthrough-desc">使用 ⌘O 打开代码项目目录，在左侧浏览与编辑源文件。</p>
          </li>
          <li class="walkthrough-card">
            <p class="walkthrough-title">AI 辅助编程</p>
            <p class="walkthrough-desc">打开项目后，在右侧 AI 面板与 Agent 协作读写、检索与修改代码。</p>
          </li>
        </ul>
        <template v-if="recentFiles.length">
          <h2 class="col-title">最近文件</h2>
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
      <input v-model="localShowOnStartup" type="checkbox" @change="onShowOnStartupChange" />
      启动时显示欢迎页
    </label>
  </section>
</template>

<style scoped>
.welcome-page {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 48px 24px;
  background: var(--wc-panel);
  min-height: 0;
  overflow: auto;
  border-left: 1px solid var(--wc-workbench-separator);
  font-family: var(--wc-font-sans);
  font-size: var(--wc-font-size-ui);
  font-weight: var(--wc-font-weight-ui);
}

.welcome-hero {
  text-align: center;
  margin-bottom: 36px;
}

.welcome-brand {
  font-size: 28px;
  font-weight: 300;
  color: var(--wc-text);
  margin: 0 0 6px;
  letter-spacing: 0.02em;
}

.welcome-tagline {
  font-size: 13px;
  color: var(--wc-text-muted);
  margin: 0;
}

.welcome-columns {
  display: flex;
  gap: 64px;
  max-width: 720px;
  width: 100%;
}

.welcome-col {
  flex: 1;
  min-width: 0;
}

.col-title {
  font-size: 20px;
  font-weight: 400;
  color: var(--wc-text);
  margin: 0 0 12px;
}

.col-empty {
  font-size: 12px;
  color: var(--wc-text-dim);
  margin: 0 0 16px;
}

.action-list,
.recent-list,
.walkthrough-list,
.recent-files-list {
  list-style: none;
  margin: 0 0 24px;
  padding: 0;
}

.action-link {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 4px 0;
  font-size: 13px;
  color: var(--wc-accent);
  text-align: left;
}

.action-link:hover:not(.disabled) {
  text-decoration: underline;
}

.action-link.disabled {
  color: var(--wc-text-dim);
  cursor: not-allowed;
}

.action-icon {
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  font-size: 14px;
}

.recent-link {
  display: block;
  width: 100%;
  padding: 4px 0;
  text-align: left;
}

.recent-link:hover .recent-name {
  color: var(--wc-accent);
}

.recent-name {
  display: block;
  font-size: 13px;
  color: var(--wc-text);
}

.recent-path {
  display: block;
  font-size: 11px;
  color: var(--wc-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.walkthrough-card {
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  background: var(--wc-bg-dark);
}

.walkthrough-title {
  font-size: 13px;
  color: var(--wc-text);
  margin: 0 0 6px;
}

.walkthrough-desc {
  font-size: 12px;
  color: var(--wc-text-muted);
  margin: 0;
  line-height: 1.5;
}

.recent-file-link {
  display: block;
  width: 100%;
  padding: 4px 0;
  font-size: 13px;
  color: var(--wc-accent);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-file-link:hover {
  text-decoration: underline;
}

.welcome-footer {
  margin-top: 32px;
  font-size: 12px;
  color: var(--wc-text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.welcome-footer input {
  accent-color: var(--wc-accent);
}
</style>

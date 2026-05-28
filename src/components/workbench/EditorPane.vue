<script setup lang="ts">
import { computed, ref } from 'vue'
import MarkdownIt from 'markdown-it'
import MonacoEditor from './MonacoEditor.vue'
import type { OpenFile } from '../../composables/workbench-state'
import type { AppTheme } from '../../types/writcraft'

const props = defineProps<{
  tabs: OpenFile[]
  activePath: string | null
  content: string
  mode: 'markdown' | 'preview'
  fontSize?: number
  appTheme?: AppTheme
}>()

const emit = defineEmits<{
  'update:content': [value: string]
  'update:mode': [value: 'markdown' | 'preview']
  select: [path: string]
  close: [path: string]
  'cursor-change': [line: number, col: number]
}>()

const monacoRef = ref<InstanceType<typeof MonacoEditor> | null>(null)
const md = new MarkdownIt()
const previewHtml = computed(() => md.render(props.content))

const revealLine = (line: number, col = 1) => {
  monacoRef.value?.revealPosition(line, col)
}

const focusEditor = () => {
  monacoRef.value?.focus()
}

const fileName = (p: string) => {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i >= 0 ? p.slice(i + 1) : p
}

defineExpose({ revealLine, focusEditor })
</script>

<template>
  <section class="editor-pane">
    <div class="tab-bar">
      <div class="tabs">
        <div
          v-for="tab in tabs"
          :key="tab.path"
          class="tab"
          :class="{ active: tab.path === activePath }"
          @click="emit('select', tab.path)"
        >
          <span v-if="tab.dirty" class="dirty-dot" title="未保存" />
          <span class="tab-icon md" />
          <span class="tab-name">{{ tab.name }}</span>
          <button
            type="button"
            class="tab-close"
            title="关闭"
            @click.stop="emit('close', tab.path)"
          >
            ×
          </button>
        </div>
        <div v-if="!tabs.length" class="tab empty-tab">
          <span class="tab-name">未打开文件</span>
        </div>
      </div>
      <div class="tab-actions">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: mode === 'preview' }"
          @click="emit('update:mode', 'preview')"
        >
          Preview
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: mode === 'markdown' }"
          @click="emit('update:mode', 'markdown')"
        >
          Markdown
        </button>
      </div>
    </div>
    <div class="editor-body">
      <MonacoEditor
        v-show="mode === 'markdown' && activePath"
        ref="monacoRef"
        :model-value="content"
        language="markdown"
        :read-only="false"
        :font-size="fontSize ?? 14"
        :app-theme="appTheme"
        @update:model-value="emit('update:content', $event)"
        @cursor-change="(line, col) => emit('cursor-change', line, col)"
      />
      <div v-show="mode === 'preview'" class="preview" v-html="previewHtml" />
      <div v-if="!activePath" class="editor-empty">
        <p>从左侧选择文件，或使用 ⌘P 命令面板</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.editor-pane {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
  background: var(--wc-panel);
  min-height: 0;
}

.tab-bar {
  height: 35px;
  display: flex;
  align-items: stretch;
  background: var(--wc-bg-dark);
  border-bottom: 1px solid var(--wc-border);
  flex-shrink: 0;
}

.tabs {
  display: flex;
  flex: 1;
  min-width: 0;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 12px;
  font-size: 12px;
  background: var(--wc-bg-dark);
  border-right: 1px solid var(--wc-border);
  max-width: 220px;
  cursor: pointer;
  flex-shrink: 0;
}

.tab.active {
  background: var(--wc-panel);
}

.tab.empty-tab {
  cursor: default;
  color: var(--wc-text-muted);
}

.dirty-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e8ab53;
  flex-shrink: 0;
}

.tab-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tab-close {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  color: var(--wc-text-muted);
}

.tab-close:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.tab-icon {
  width: 14px;
  height: 14px;
  background: #519aba;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpath fill='black' d='M4 1h6l4 4v10H4V1zm5 1v3h3'/%3E%3C/svg%3E")
    center/contain no-repeat;
}

.tab-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 0 8px;
  flex-shrink: 0;
}

.mode-btn {
  padding: 4px 10px;
  font-size: 12px;
  border-radius: 4px;
  color: var(--wc-text-muted);
}

.mode-btn:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.mode-btn.active {
  background: var(--wc-active);
  color: var(--wc-text);
}

.editor-body {
  flex: 1;
  min-height: 0;
  position: relative;
}

.editor-empty {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--wc-text-muted);
  font-size: 13px;
  gap: 8px;
}

.preview {
  height: 100%;
  overflow: auto;
  padding: 16px 24px;
  line-height: 1.6;
  font-size: 14px;
}

.preview :deep(h1),
.preview :deep(h2),
.preview :deep(h3) {
  margin: 1em 0 0.5em;
}

.preview :deep(p) {
  margin: 0.5em 0;
}

.preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.preview :deep(th),
.preview :deep(td) {
  border: 1px solid var(--wc-border);
  padding: 6px 10px;
  text-align: left;
}

.preview :deep(th) {
  background: var(--wc-hover);
  font-weight: 600;
}

.preview :deep(pre) {
  margin: 10px 0;
  padding: 10px 14px;
  background: var(--wc-code-block-bg);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  overflow-x: auto;
  font-family: var(--wc-font-mono);
  font-size: 12px;
  line-height: 1.55;
}

.preview :deep(code) {
  font-family: var(--wc-font-mono);
  font-size: 12px;
}

.preview :deep(:not(pre) > code) {
  padding: 0.1em 0.35em;
  border-radius: 4px;
  background: var(--wc-code-block-bg);
  border: 1px solid var(--wc-border);
}

.preview :deep(pre code) {
  padding: 0;
  background: transparent;
  border: none;
}
</style>

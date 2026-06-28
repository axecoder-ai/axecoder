<script setup lang="ts">
import { computed, defineAsyncComponent, ref, watch, onBeforeUnmount } from 'vue'
import MarkdownIt from 'markdown-it'
import EditorBreadcrumb from './EditorBreadcrumb.vue'

const MonacoEditor = defineAsyncComponent(() => import('./MonacoEditor.vue'))
const DocumentPreviewPane = defineAsyncComponent(() => import('./DocumentPreviewPane.vue'))
import type { OpenFile } from '../../composables/workbench-state'
import type { AppTheme } from '../../types/axecoder'
import { isMarkdownPath, monacoLanguageForPath } from '../../utils/editor-language'
import { documentPreviewKind } from '../../utils/document-preview'

const props = defineProps<{
  tabs: OpenFile[]
  activePath: string | null
  content: string
  mode: 'markdown' | 'preview'
  fontSize?: number
  appTheme?: AppTheme
  projectRoot?: string
  minimap?: boolean
  semanticHighlighting?: boolean
}>()

const emit = defineEmits<{
  'update:content': [value: string]
  'update:mode': [value: 'markdown' | 'preview']
  'update:tabs': [tabs: OpenFile[]]
  select: [path: string]
  close: [path: string]
  'cursor-change': [line: number, col: number]
  'go-to-definition': [file: string, line: number, col: number]
  'breadcrumb-navigate': [path: string]
}>()

const monacoRef = ref<InstanceType<typeof MonacoEditor> | null>(null)
const secondaryMonacoRef = ref<InstanceType<typeof MonacoEditor> | null>(null)
const diffContainer = ref<HTMLElement | null>(null)
const md = new MarkdownIt()
const previewHtml = computed(() => md.render(props.content))
const isMarkdown = computed(() => isMarkdownPath(props.activePath))
const activeTab = computed(() => props.tabs.find((t) => t.path === props.activePath) ?? null)
const isDiffTab = computed(() => activeTab.value?.kind === 'diff')
const editorLanguage = computed(() =>
  activeTab.value?.languageOverride ?? monacoLanguageForPath(props.activePath),
)
const previewKind = computed(() => documentPreviewKind(props.activePath))
const activePreviewFile = computed(() => activeTab.value)
const isDocumentPreview = computed(() => previewKind.value !== null)

const splitDirection = ref<'horizontal' | 'vertical' | null>(null)
const secondaryPath = ref<string | null>(null)
const dragTabIndex = ref<number | null>(null)

let diffEditor: import('monaco-editor').editor.IStandaloneDiffEditor | null = null
let diffMonaco: typeof import('monaco-editor') | null = null

const secondaryContent = computed(() => {
  const p = secondaryPath.value
  if (!p) return ''
  return props.tabs.find((t) => t.path === p)?.content ?? ''
})

const revealLine = (line: number, col = 1) => {
  if (isDiffTab.value && diffEditor) {
    diffEditor.getModifiedEditor().revealLineInCenter(line)
    diffEditor.getModifiedEditor().setPosition({ lineNumber: line, column: col })
    return
  }
  monacoRef.value?.revealPosition(line, col)
}

const focusEditor = () => {
  if (isDiffTab.value) diffEditor?.getModifiedEditor().focus()
  else monacoRef.value?.focus()
}

const getEditorSelection = (): string => {
  const ed = isDiffTab.value ? diffEditor?.getModifiedEditor() : monacoRef.value?.getEditor?.()
  if (!ed) return ''
  const sel = ed.getSelection()
  const model = ed.getModel()
  if (!sel || !model || sel.isEmpty()) return ''
  return model.getValueInRange(sel)
}

const formatDocument = () => {
  monacoRef.value?.formatDocument?.()
}

const splitHorizontal = () => {
  if (!props.activePath) return
  splitDirection.value = 'horizontal'
  secondaryPath.value = props.activePath
}

const splitVertical = () => {
  if (!props.activePath) return
  splitDirection.value = 'vertical'
  secondaryPath.value = props.activePath
}

const closeSplit = () => {
  splitDirection.value = null
  secondaryPath.value = null
}

const pinTab = (path: string) => {
  emit(
    'update:tabs',
    props.tabs.map((t) => (t.path === path ? { ...t, pinned: true, preview: false } : t)),
  )
}

const onTabClick = (path: string, tab: OpenFile) => {
  if (tab.preview && !tab.pinned) pinTab(path)
  emit('select', path)
}

const onTabDragStart = (e: DragEvent, index: number) => {
  dragTabIndex.value = index
  e.dataTransfer!.effectAllowed = 'move'
}

const onTabDrop = (index: number) => {
  const from = dragTabIndex.value
  dragTabIndex.value = null
  if (from === null || from === index) return
  const next = [...props.tabs]
  const [item] = next.splice(from, 1)
  next.splice(index, 0, item!)
  emit('update:tabs', next)
}

const mountDiffEditor = async () => {
  if (!diffContainer.value || !isDiffTab.value || !activeTab.value) return
  await import('../../monaco-setup')
  diffMonaco = await import('monaco-editor')
  diffEditor?.dispose()
  const themeId = (await import('../../utils/apply-theme')).monacoThemeFor(props.appTheme ?? 'vscode')
  diffMonaco.editor.setTheme(themeId)
  const fp = props.activePath!
  const original = activeTab.value.diffOriginal ?? ''
  const modified = props.content
  diffEditor = diffMonaco.editor.createDiffEditor(diffContainer.value, {
    automaticLayout: true,
    readOnly: false,
    renderSideBySide: true,
    fontSize: props.fontSize ?? 14,
  })
  const origModel = diffMonaco.editor.createModel(original, editorLanguage.value, diffMonaco.Uri.file(fp + '.orig'))
  const modModel = diffMonaco.editor.createModel(modified, editorLanguage.value, diffMonaco.Uri.file(fp))
  diffEditor.setModel({ original: origModel, modified: modModel })
  diffEditor.getModifiedEditor().onDidChangeModelContent(() => {
    emit('update:content', diffEditor!.getModifiedEditor().getValue())
  })
}

const disposeDiffEditor = () => {
  diffEditor?.dispose()
  diffEditor = null
}

watch(
  () => [isDiffTab.value, props.activePath, props.content, activeTab.value?.diffOriginal] as const,
  () => {
    if (isDiffTab.value) void mountDiffEditor()
    else disposeDiffEditor()
  },
)

watch(
  () => props.appTheme,
  async (theme) => {
    if (!diffMonaco || !theme) return
    diffMonaco.editor.setTheme((await import('../../utils/apply-theme')).monacoThemeFor(theme))
  },
)

onBeforeUnmount(() => {
  disposeDiffEditor()
})

const openDiffTab = (path: string, original: string, modified: string) => {
  const name = path.split(/[/\\]/).pop() || path
  const diffPath = `${path} (diff)`
  const existing = props.tabs.find((t) => t.path === diffPath)
  const tab: OpenFile = {
    path: diffPath,
    name: `${name} (diff)`,
    content: modified,
    dirty: false,
    kind: 'diff',
    diffOriginal: original,
    pinned: true,
  }
  const next = existing
    ? props.tabs.map((t) => (t.path === diffPath ? { ...tab, dirty: t.dirty } : t))
    : [...props.tabs, tab]
  emit('update:tabs', next)
  emit('select', diffPath)
  splitDirection.value = null
}

defineExpose({
  revealLine,
  focusEditor,
  getEditorSelection,
  formatDocument,
  splitHorizontal,
  splitVertical,
  closeSplit,
  openDiffTab,
})
</script>

<template>
  <section class="editor-pane">
    <div class="tab-bar">
      <div class="tabs">
        <div
          v-for="(tab, index) in tabs"
          :key="tab.path"
          class="tab"
          :class="{ active: tab.path === activePath, preview: tab.preview && !tab.pinned }"
          draggable="true"
          @click="onTabClick(tab.path, tab)"
          @dragstart="onTabDragStart($event, index)"
          @dragover.prevent
          @drop="onTabDrop(index)"
        >
          <span v-if="tab.dirty" class="dirty-dot" title="Unsaved" />
          <span class="tab-icon md" />
          <span class="tab-name">{{ tab.name }}</span>
          <button
            type="button"
            class="tab-close"
            title="Close"
            @click.stop="emit('close', tab.path)"
          >
            ×
          </button>
        </div>
      </div>
      <div v-if="isMarkdown && !isDiffTab" class="tab-actions">
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
    <EditorBreadcrumb
      v-if="projectRoot && activePath && !isDiffTab"
      :project-root="projectRoot"
      :active-path="activePath"
      @navigate="emit('breadcrumb-navigate', $event)"
    />
    <div
      class="editor-body"
      :class="{ 'split-h': splitDirection === 'horizontal', 'split-v': splitDirection === 'vertical' }"
    >
      <div v-if="isDiffTab" ref="diffContainer" class="diff-host" />
      <template v-else-if="activePath && isDocumentPreview && previewKind">
        <DocumentPreviewPane
          :kind="previewKind"
          :preview-base64="activePreviewFile?.previewBase64"
          :preview-html="activePreviewFile?.previewHtml"
        />
      </template>
      <template v-else-if="activePath && (isMarkdown ? mode === 'markdown' : true)">
        <div class="editor-split primary">
          <MonacoEditor
            ref="monacoRef"
            :model-value="content"
            :language="editorLanguage"
            :read-only="false"
            :font-size="fontSize ?? 14"
            :app-theme="appTheme"
            :minimap="minimap"
            :semantic-highlighting="semanticHighlighting"
            :project-root="projectRoot ?? ''"
            :file-path="activePath"
            @update:model-value="emit('update:content', $event)"
            @cursor-change="(line, col) => emit('cursor-change', line, col)"
            @go-to-definition="(f, l, c) => emit('go-to-definition', f, l, c)"
          />
        </div>
        <div v-if="splitDirection && secondaryPath" class="editor-split secondary">
          <MonacoEditor
            ref="secondaryMonacoRef"
            :model-value="secondaryContent"
            :language="monacoLanguageForPath(secondaryPath)"
            :read-only="true"
            :font-size="fontSize ?? 14"
            :app-theme="appTheme"
            :minimap="minimap"
            :project-root="projectRoot ?? ''"
            :file-path="secondaryPath"
          />
        </div>
      </template>
      <div v-show="isMarkdown && mode === 'preview'" class="preview" v-html="previewHtml" />
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
  border-left: 1px solid var(--wc-workbench-separator);
  font-family: var(--wc-font-sans);
  font-size: var(--wc-font-size-ui);
}

.tab-bar {
  height: 35px;
  display: flex;
  align-items: stretch;
  background: var(--wc-bg-dark);
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

.tab.preview .tab-name {
  font-style: italic;
}

.tab.active {
  background: var(--wc-panel);
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
  display: flex;
  flex-direction: column;
}

.editor-body.split-h {
  flex-direction: row;
}

.editor-body.split-v {
  flex-direction: column;
}

.editor-split {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.editor-body.split-h .editor-split,
.editor-body.split-v .editor-split {
  border: 1px solid var(--wc-border);
}

.diff-host {
  width: 100%;
  height: 100%;
  min-height: 0;
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

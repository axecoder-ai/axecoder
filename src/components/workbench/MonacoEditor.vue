<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type * as Monaco from 'monaco-editor'
import type { AppTheme } from '../../types/axecoder'
import { monacoThemeFor } from '../../utils/apply-theme'

const props = defineProps<{
  modelValue: string
  language?: string
  readOnly?: boolean
  fontSize?: number
  appTheme?: AppTheme
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'cursor-change': [line: number, col: number]
}>()

const container = ref<HTMLElement | null>(null)
const editorReady = ref(false)
const loadError = ref<string | null>(null)
let monaco: typeof Monaco | null = null
let editor: Monaco.editor.IStandaloneCodeEditor | null = null

const mountEditor = async () => {
  if (!container.value || editor) return
  try {
    await import('../../monaco-setup')
    monaco = await import('monaco-editor')
    const themeId = monacoThemeFor(props.appTheme ?? 'vscode')
    monaco.editor.setTheme(themeId)
    editor = monaco.editor.create(container.value, {
      value: props.modelValue,
      language: props.language ?? 'plaintext',
      theme: themeId,
      automaticLayout: true,
      fontSize: props.fontSize ?? 14,
      fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
      fontLigatures: false,
      lineNumbers: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 8 },
      readOnly: props.readOnly,
    })
    editor.onDidChangeModelContent(() => {
      emit('update:modelValue', editor?.getValue() ?? '')
    })
    editor.onDidChangeCursorPosition((e) => {
      emit('cursor-change', e.position.lineNumber, e.position.column)
    })
    const pos = editor.getPosition()
    if (pos) emit('cursor-change', pos.lineNumber, pos.column)
    editorReady.value = true
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : '编辑器加载失败'
  }
}

onMounted(() => {
  void mountEditor()
})

watch(
  () => props.modelValue,
  (val) => {
    if (editor && editor.getValue() !== val) editor.setValue(val)
  },
)

watch(
  () => props.readOnly,
  (ro) => {
    editor?.updateOptions({ readOnly: ro })
  },
)

watch(
  () => props.fontSize,
  (size) => {
    if (size) editor?.updateOptions({ fontSize: size })
  },
)

watch(
  () => props.language,
  (lang) => {
    if (!monaco || !editor) return
    const model = editor.getModel()
    if (model && lang) monaco.editor.setModelLanguage(model, lang)
  },
)

watch(
  () => props.appTheme,
  (theme) => {
    if (!monaco) return
    monaco.editor.setTheme(monacoThemeFor(theme ?? 'vscode'))
  },
)

onBeforeUnmount(() => {
  editor?.dispose()
  editor = null
  monaco = null
})

const revealPosition = (line: number, col: number) => {
  if (!editor) return
  editor.revealLineInCenter(line)
  editor.setPosition({ lineNumber: line, column: col })
  editor.focus()
}

const focus = () => {
  editor?.focus()
}

defineExpose({
  focus,
  getEditor: () => editor,
  revealPosition,
})
</script>

<template>
  <div ref="container" class="monaco-host">
    <div v-if="loadError" class="monaco-error">{{ loadError }}</div>
    <div v-else-if="!editorReady" class="monaco-loading">加载编辑器…</div>
  </div>
</template>

<style scoped>
.monaco-host {
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
  background: var(--wc-panel);
}

.monaco-loading,
.monaco-error {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  pointer-events: none;
}

.monaco-loading {
  color: var(--wc-text-muted);
}

.monaco-error {
  color: #f48771;
  padding: 0 16px;
  text-align: center;
}
</style>

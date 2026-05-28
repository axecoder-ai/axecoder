<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as monaco from 'monaco-editor'
import '../../monaco-setup'
import type { AppTheme } from '../../types/writcraft'
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
let editor: monaco.editor.IStandaloneCodeEditor | null = null

onMounted(() => {
  if (!container.value) return
  editor = monaco.editor.create(container.value, {
    value: props.modelValue,
    language: props.language ?? 'markdown',
    theme: monacoThemeFor(props.appTheme ?? 'vscode'),
    automaticLayout: true,
    fontSize: props.fontSize ?? 14,
    fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
    fontLigatures: true,
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
  () => props.appTheme,
  (theme) => {
    monaco.editor.setTheme(monacoThemeFor(theme ?? 'vscode'))
  },
)

onBeforeUnmount(() => {
  editor?.dispose()
  editor = null
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
  <div ref="container" class="monaco-host" />
</template>

<style scoped>
.monaco-host {
  width: 100%;
  height: 100%;
  min-height: 0;
}
</style>

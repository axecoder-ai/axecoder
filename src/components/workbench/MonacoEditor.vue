<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, computed } from 'vue'
import type * as Monaco from 'monaco-editor'
import type { AppTheme } from '../../types/axecoder'
import { monacoThemeFor } from '../../utils/apply-theme'
import { useMonacoLsp } from '../../composables/useMonacoLsp'
import { loadSnippets } from '../../utils/load-snippets'

const props = defineProps<{
  modelValue: string
  language?: string
  readOnly?: boolean
  fontSize?: number
  appTheme?: AppTheme
  minimap?: boolean
  semanticHighlighting?: boolean
  projectRoot?: string
  filePath?: string | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'cursor-change': [line: number, col: number]
  'go-to-definition': [file: string, line: number, col: number]
}>()

const container = ref<HTMLElement | null>(null)
const editorReady = ref(false)
const loadError = ref<string | null>(null)
const monacoRef = ref<typeof Monaco | null>(null)
const editorRef = ref<Monaco.editor.IStandaloneCodeEditor | null>(null)
let monaco: typeof Monaco | null = null
let editor: Monaco.editor.IStandaloneCodeEditor | null = null
let syncingModelValue = false
let f12Disposable: Monaco.IDisposable | null = null

const contentRef = computed(() => props.modelValue)
const projectRootRef = computed(() => props.projectRoot ?? '')
const filePathRef = computed(() => props.filePath ?? null)

const lsp = useMonacoLsp({
  projectRoot: projectRootRef,
  filePath: filePathRef,
  content: contentRef,
  monaco: monacoRef,
  editor: editorRef,
})

const mountEditor = async () => {
  if (!container.value || editor) return
  try {
    await import('../../monaco-setup')
    monaco = await import('monaco-editor')
    monacoRef.value = monaco
    await loadSnippets(monaco)
    const themeId = monacoThemeFor(props.appTheme ?? 'vscode')
    monaco.editor.setTheme(themeId)
    const uri = props.filePath
      ? monaco.Uri.file(props.filePath)
      : monaco.Uri.parse('inmemory://model/untitled')
    const model = monaco.editor.createModel(props.modelValue, props.language ?? 'plaintext', uri)
    editor = monaco.editor.create(container.value, {
      model,
      theme: themeId,
      automaticLayout: true,
      fontSize: props.fontSize ?? 14,
      fontFamily: "'JetBrains Mono', 'SF Mono', Menlo, Monaco, 'Courier New', monospace",
      fontLigatures: false,
      lineNumbers: 'on',
      minimap: { enabled: props.minimap ?? false },
      'semanticHighlighting.enabled': props.semanticHighlighting ?? false,
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      padding: { top: 8 },
      readOnly: props.readOnly,
    })
    editorRef.value = editor
    editor.onDidChangeModelContent(() => {
      if (syncingModelValue) return
      emit('update:modelValue', editor?.getValue() ?? '')
    })
    editor.onDidChangeCursorPosition((e) => {
      emit('cursor-change', e.position.lineNumber, e.position.column)
    })
    f12Disposable = editor.addAction({
      id: 'go-to-definition',
      label: 'Go to Definition',
      keybindings: [monaco.KeyCode.F12],
      run: async (ed) => {
        const pos = ed.getPosition()
        const fp = props.filePath
        const root = props.projectRoot
        if (!pos || !fp || !root) return
        const res = await window.axecoder.lspDefinition(root, fp, pos.lineNumber, pos.column)
        const result = res.result
        if (!result) return
        const item = Array.isArray(result) ? result[0] : result
        const loc = item as {
          uri?: string
          targetUri?: string
          range?: { start: { line: number; character: number } }
          targetRange?: { start: { line: number; character: number } }
        }
        const uri = loc.uri ?? loc.targetUri
        const range = loc.range ?? loc.targetRange
        if (!uri || !range) return
        const file = uri.replace(/^file:\/\//, '')
        emit('go-to-definition', decodeURIComponent(file), range.start.line + 1, range.start.character + 1)
      },
    })
    const pos = editor.getPosition()
    if (pos) emit('cursor-change', pos.lineNumber, pos.column)
    lsp.start()
    if (props.filePath && props.projectRoot) void lsp.syncOpen()
    editorReady.value = true
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : 'Editor failed to load'
  }
}

onMounted(() => {
  void mountEditor()
})

watch(
  () => props.modelValue,
  (val) => {
    if (!editor || editor.getValue() === val) return
    syncingModelValue = true
    try {
      editor.setValue(val)
    } finally {
      syncingModelValue = false
    }
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

watch(
  () => props.minimap,
  (enabled) => {
    editor?.updateOptions({ minimap: { enabled: enabled ?? false } })
  },
)

watch(
  () => props.semanticHighlighting,
  (enabled) => {
    editor?.updateOptions({ 'semanticHighlighting.enabled': enabled ?? false })
  },
)

watch(
  () => props.filePath,
  (path) => {
    if (!monaco || !editor || !path) return
    const model = editor.getModel()
    if (model && model.uri.fsPath !== path) {
      const lang = props.language ?? model.getLanguageId()
      const newModel = monaco.editor.createModel(model.getValue(), lang, monaco.Uri.file(path))
      editor.setModel(newModel)
      model.dispose()
    }
  },
)

onBeforeUnmount(() => {
  const model = editor?.getModel()
  f12Disposable?.dispose()
  editor?.dispose()
  model?.dispose()
  editor = null
  editorRef.value = null
  monaco = null
  monacoRef.value = null
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

const formatDocument = async () => {
  const root = props.projectRoot
  const fp = props.filePath
  if (!root || !fp || !editor) return
  const res = await window.axecoder.lspFormat(root, fp)
  const edits = res.result as { range?: unknown; newText?: string }[] | null
  if (!edits?.length) {
    await editor.getAction('editor.action.formatDocument')?.run()
    return
  }
  const model = editor.getModel()
  if (!model) return
  editor.executeEdits('lsp-format', edits as Monaco.editor.IIdentifiedSingleEditOperation[])
}

defineExpose({
  focus,
  getEditor: () => editor,
  revealPosition,
  formatDocument,
})
</script>

<template>
  <div ref="container" class="monaco-host">
    <div v-if="loadError" class="monaco-error">{{ loadError }}</div>
    <div v-else-if="!editorReady" class="monaco-loading">Loading editor…</div>
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

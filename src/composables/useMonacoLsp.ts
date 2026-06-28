import { onBeforeUnmount, watch, type Ref } from 'vue'
import type * as Monaco from 'monaco-editor'
import type { EditorDiagnostic } from '../types/axecoder'

type LspOpts = {
  projectRoot: import('vue').Ref<string> | import('vue').ComputedRef<string>
  filePath: import('vue').Ref<string | null> | import('vue').ComputedRef<string | null>
  content: import('vue').Ref<string> | import('vue').ComputedRef<string>
  monaco: import('vue').Ref<typeof Monaco | null>
  editor: import('vue').Ref<Monaco.editor.IStandaloneCodeEditor | null>
}

const diagnosticStore = new Map<string, EditorDiagnostic[]>()

export const getAllDiagnostics = (): EditorDiagnostic[] => {
  const out: EditorDiagnostic[] = []
  for (const list of diagnosticStore.values()) out.push(...list)
  return out
}

export const useMonacoLsp = (opts: LspOpts) => {
  let changeTimer: ReturnType<typeof setTimeout> | undefined
  let version = 1
  let offDiag: (() => void) | undefined
  let offRefresh: (() => void) | undefined
  const disposables: Monaco.IDisposable[] = []

  const applyMarkers = (file: string) => {
    const monaco = opts.monaco.value
    const editor = opts.editor.value
    if (!monaco || !editor) return
    const model = editor.getModel()
    if (!model) return
    const modelPath = model.uri.fsPath || model.uri.path
    if (modelPath !== file && !file.endsWith(modelPath) && !modelPath.endsWith(file)) return
    const list = diagnosticStore.get(file) ?? []
    const markers: Monaco.editor.IMarkerData[] = list.map((d) => ({
      severity:
        d.severity === 'error'
          ? monaco.MarkerSeverity.Error
          : d.severity === 'warning'
            ? monaco.MarkerSeverity.Warning
            : monaco.MarkerSeverity.Info,
      message: d.message,
      startLineNumber: d.line,
      startColumn: d.col,
      endLineNumber: d.endLine ?? d.line,
      endColumn: d.endCol ?? d.col + 1,
      source: d.source,
    }))
    monaco.editor.setModelMarkers(model!, 'lsp', markers)
  }

  const syncOpen = async () => {
    const root = opts.projectRoot.value
    const path = opts.filePath.value
    if (!root || !path) return
    await window.axecoder.lspEnsureProject(root)
    const res = await window.axecoder.lspDidOpen(root, path, opts.content.value)
    if (res.ok) version = res.version
  }

  const syncChange = async () => {
    const root = opts.projectRoot.value
    const path = opts.filePath.value
    if (!root || !path) return
    version++
    await window.axecoder.lspDidChange(root, path, opts.content.value, version)
  }

  const syncClose = async (path: string) => {
    const root = opts.projectRoot.value
    if (!root || !path) return
    await window.axecoder.lspDidClose(root, path)
  }

  const bindProviders = () => {
    const monaco = opts.monaco.value
    if (!monaco) return
    disposables.push(
      monaco.languages.registerHoverProvider('*', {
        provideHover: async (model, pos) => {
          const root = opts.projectRoot.value
          const fp = opts.filePath.value
          if (!root || !fp) return null
          const res = await window.axecoder.lspHover(root, fp, pos.lineNumber, pos.column)
          const hover = res.result as { contents?: { value?: string }[] | { value?: string } } | null
          if (!hover?.contents) return null
          const contents = Array.isArray(hover.contents)
            ? hover.contents.map((c) => (typeof c === 'string' ? c : c.value ?? '')).join('\n')
            : typeof hover.contents === 'string'
              ? hover.contents
              : hover.contents.value ?? ''
          return { contents: [{ value: contents }] }
        },
      }),
    )
    disposables.push(
      monaco.languages.registerDefinitionProvider('*', {
        provideDefinition: async (model, pos) => {
          const root = opts.projectRoot.value
          const fp = opts.filePath.value
          if (!root || !fp) return null
          const res = await window.axecoder.lspDefinition(root, fp, pos.lineNumber, pos.column)
          const result = res.result
          if (!result) return null
          const items = Array.isArray(result) ? result : [result]
          return items.map((item: { uri?: string; range?: { start: { line: number; character: number }; end: { line: number; character: number } }; targetUri?: string; targetRange?: { start: { line: number; character: number }; end: { line: number; character: number } } }) => {
            const uri = item.uri ?? item.targetUri
            const range = item.range ?? item.targetRange
            if (!uri || !range) return null
            return {
              uri: monaco.Uri.parse(uri),
              range: {
                startLineNumber: range.start.line + 1,
                startColumn: range.start.character + 1,
                endLineNumber: range.end.line + 1,
                endColumn: range.end.character + 1,
              },
            }
          }).filter(Boolean) as Monaco.languages.Location[]
        },
      }),
    )
    disposables.push(
      monaco.languages.registerCompletionItemProvider('*', {
        triggerCharacters: ['.', '/', '"', "'", '<', '@'],
        provideCompletionItems: async (model, pos) => {
          const root = opts.projectRoot.value
          const fp = opts.filePath.value
          if (!root || !fp) return { suggestions: [] }
          const res = await window.axecoder.lspCompletion(root, fp, pos.lineNumber, pos.column)
          const result = res.result as { items?: { label: string; kind?: number; insertText?: string }[] } | { label: string; insertText?: string }[] | null
          if (!result) return { suggestions: [] }
          const items = Array.isArray(result) ? result : result.items ?? []
          const range = {
            startLineNumber: pos.lineNumber,
            startColumn: pos.column,
            endLineNumber: pos.lineNumber,
            endColumn: pos.column,
          }
          return {
            suggestions: items.map((item) => ({
              label: item.label,
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: item.insertText ?? item.label,
              range,
            })),
          }
        },
      }),
    )
  }

  const start = () => {
    offDiag = window.axecoder.onLspDiagnostics(({ file, diagnostics }) => {
      diagnosticStore.set(file, diagnostics)
      if (opts.filePath.value === file) applyMarkers(file)
    })
    offRefresh = window.axecoder.onLspRefreshFile(({ file }) => {
      if (opts.filePath.value === file) {
        void window.axecoder.lspDidChange(opts.projectRoot.value, file, opts.content.value, ++version)
      }
    })
    bindProviders()
  }

  watch(
    () => opts.filePath.value,
    async (path, prev) => {
      if (prev) await syncClose(prev)
      if (path) {
        version = 1
        await syncOpen()
        applyMarkers(path)
      }
    },
  )

  watch(
    () => opts.content.value,
    () => {
      if (changeTimer) clearTimeout(changeTimer)
      changeTimer = setTimeout(() => {
        void syncChange()
      }, 300)
    },
  )

  watch(
    () => opts.monaco.value,
    () => {
      for (const d of disposables) d.dispose()
      disposables.length = 0
      bindProviders()
    },
  )

  onBeforeUnmount(() => {
    offDiag?.()
    offRefresh?.()
    for (const d of disposables) d.dispose()
    if (changeTimer) clearTimeout(changeTimer)
    const p = opts.filePath.value
    if (p) void syncClose(p)
  })

  return { start, applyMarkers, syncOpen, syncChange }
}

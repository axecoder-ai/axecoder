import type * as Monaco from 'monaco-editor'

const SNIPPET_STORAGE_KEY = 'axecoder.snippets.paths'

/** 从 localStorage 占位路径加载 snippet JSON，注册到 Monaco */
export const loadSnippets = async (monaco: typeof Monaco) => {
  let paths: string[] = []
  try {
    const raw = localStorage.getItem(SNIPPET_STORAGE_KEY)
    if (raw) paths = JSON.parse(raw) as string[]
  } catch {
    paths = []
  }
  if (!paths.length) return

  for (const p of paths) {
    try {
      const { content } = await window.axecoder.readFile(p)
      const data = JSON.parse(content) as Record<
        string,
        { prefix?: string; body?: string | string[]; description?: string }
      >
      for (const [lang, snip] of Object.entries(data)) {
        const body = Array.isArray(snip.body) ? snip.body.join('\n') : snip.body ?? ''
        monaco.languages.registerCompletionItemProvider(lang === 'global' ? '*' : lang, {
          provideCompletionItems: (model, pos) => ({
            suggestions: [
              {
                label: snip.prefix ?? Object.keys(data)[0] ?? 'snippet',
                kind: monaco.languages.CompletionItemKind.Snippet,
                insertText: body,
                insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: snip.description,
                range: {
                  startLineNumber: pos.lineNumber,
                  startColumn: pos.column,
                  endLineNumber: pos.lineNumber,
                  endColumn: pos.column,
                },
              },
            ],
          }),
        })
      }
    } catch {
      /* skip unreadable snippet files */
    }
  }
}

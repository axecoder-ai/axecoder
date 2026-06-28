import { ref, computed, watch } from 'vue'
import type {
  AppSettings,
  SearchHit,
  SearchOptions,
  SearchReplaceResult,
} from '../types/axecoder'
import { applyTheme } from '../utils/apply-theme'
import { normalizeLocale, setAppLocale } from '../i18n'
import { useI18n } from '../i18n'
import {
  fileNameFromPath,
  upsertOpenFile,
  closeOpenFile,
  updateOpenFilePath,
  anyDirty,
  nextActiveAfterClose,
  type OpenFile,
  type SaveStatus,
} from './workbench-state'
import { documentPreviewKind } from '../utils/document-preview'
import { appConfirm } from '../utils/appConfirm'

export const useWorkbench = () => {
  const { t } = useI18n()
  const fs = window.axecoder

  const openFiles = ref<OpenFile[]>([])
  const activePath = ref<string | null>(null)
  const projectRoot = ref('')
  const projectName = ref('')
  const saveStatus = ref<SaveStatus>('idle')
  const settings = ref<AppSettings>({
    schemaVersion: 1,
    autoSave: true,
    autoSaveDelay: 400,
    fontSize: 14,
    theme: 'vscode',
    agentAutoApplyWrites: false,
    agentAutoPlan: 'on',
    agentOutputStyle: 'default',
    agentCompletionSoundEnabled: false,
    agentCompletionSoundPath: '',
    agentCompletionSoundDisplayName: '',
  })

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let offMenu: (() => void) | null = null
  let offQuit: (() => void) | null = null
  let offFileChanged: (() => void) | null = null
  let scmRefreshHook: (() => void) | null = null

  const TABS_STORAGE_KEY = 'axecoder.openTabs'

  const persistTabs = () => {
    if (!projectRoot.value) return
    const payload = {
      root: projectRoot.value,
      paths: openFiles.value.map((f) => f.path),
      active: activePath.value,
    }
    sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(payload))
  }

  const restoreTabs = async () => {
    const raw = sessionStorage.getItem(TABS_STORAGE_KEY)
    if (!raw || !projectRoot.value) return
    try {
      const { root, paths, active } = JSON.parse(raw) as {
        root: string
        paths: string[]
        active: string | null
      }
      if (root !== projectRoot.value || !paths?.length) return
      for (const p of paths) {
        try {
          await openFileAtPath(p)
        } catch {
          /* skip missing files */
        }
      }
      if (active && openFiles.value.some((f) => f.path === active)) {
        activePath.value = active
      }
    } catch {
      /* ignore corrupt storage */
    }
  }

  const setScmRefreshHook = (fn: (() => void) | null) => {
    scmRefreshHook = fn
  }

  const activeFile = computed(() =>
    activePath.value
      ? openFiles.value.find((f) => f.path === activePath.value) ?? null
      : null,
  )

  const editorContent = computed({
    get: () => activeFile.value?.content ?? '',
    set: (val: string) => {
      const path = activePath.value
      if (!path) return
      const idx = openFiles.value.findIndex((f) => f.path === path)
      if (idx < 0) return
      const next = [...openFiles.value]
      next[idx] = { ...next[idx], content: val, dirty: true }
      openFiles.value = next
      saveStatus.value = 'idle'
      scheduleAutoSave()
    },
  })

  const scheduleAutoSave = () => {
    if (!settings.value.autoSave || !activePath.value) return
    if (saveTimer) clearTimeout(saveTimer)
    saveTimer = setTimeout(() => {
      void saveCurrent()
    }, settings.value.autoSaveDelay)
  }

  const saveOpenFile = async (file: OpenFile): Promise<boolean> => {
    saveStatus.value = 'saving'
    try {
      await fs.writeFile(file.path, file.content)
      const idx = openFiles.value.findIndex((f) => f.path === file.path)
      if (idx >= 0) {
        const next = [...openFiles.value]
        next[idx] = { ...next[idx], dirty: false }
        openFiles.value = next
      }
      saveStatus.value = 'saved'
      scmRefreshHook?.()
      return true
    } catch (e) {
      saveStatus.value = 'error'
      const msg = e instanceof Error ? e.message : 'Save failed'
      window.alert(t('explorer.saveFailedAlert', { path: file.path, msg }))
      return false
    }
  }

  const saveCurrent = async (): Promise<boolean> => {
    const file = activeFile.value
    if (!file) return true
    return saveOpenFile(file)
  }

  const saveAllDirty = async (): Promise<boolean> => {
    for (const file of openFiles.value) {
      if (!file.dirty) continue
      const prev = activePath.value
      activePath.value = file.path
      const ok = await saveCurrent()
      if (!ok) {
        activePath.value = prev
        return false
      }
    }
    return true
  }

  const confirmDirty = async (message: string): Promise<'save' | 'discard' | 'cancel'> => {
    const choice = await appConfirm(t('explorer.confirmSaveContinue', { message }))
    if (choice) return 'save'
    const discard = await appConfirm(t('explorer.confirmDiscard'))
    if (discard) return 'discard'
    return 'cancel'
  }

  const openFileAtPath = async (path: string, content?: string, opts?: { preview?: boolean }) => {
    const existing = openFiles.value.find((f) => f.path === path)
    if (existing) {
      activePath.value = path
      if (opts?.preview === false || !existing.preview) {
        openFiles.value = openFiles.value.map((f) =>
          f.path === path ? { ...f, preview: false, pinned: true } : f,
        )
      }
      return
    }
    const previewKind = documentPreviewKind(path)
    let file: OpenFile
    if (previewKind === 'pdf') {
      const { base64 } = await fs.readFileBase64(path)
      file = {
        path,
        name: fileNameFromPath(path),
        content: '',
        dirty: false,
        previewKind: 'pdf',
        previewBase64: base64,
      }
    } else if (previewKind === 'docx') {
      const { html } = await fs.previewDocx(path)
      file = {
        path,
        name: fileNameFromPath(path),
        content: '',
        dirty: false,
        previewKind: 'docx',
        previewHtml: html,
      }
    } else if (previewKind === 'doc') {
      file = {
        path,
        name: fileNameFromPath(path),
        content: '',
        dirty: false,
        previewKind: 'doc',
      }
    } else if (previewKind === 'image') {
      const { base64 } = await fs.readFileBase64(path)
      file = {
        path,
        name: fileNameFromPath(path),
        content: '',
        dirty: false,
        previewKind: 'image',
        previewBase64: base64,
      }
    } else {
      let text: string
      if (content !== undefined) {
        text = content
      } else {
        const res = await fs.readFile(path)
        text = res.content
      }
      file = {
        path,
        name: fileNameFromPath(path),
        content: text,
        dirty: false,
        preview: opts?.preview,
        eol: text.includes('\r\n') ? 'CRLF' : 'LF',
      }
    }
    openFiles.value = upsertOpenFile(openFiles.value, file)
    activePath.value = path
    persistTabs()
  }

  const openFileFromDisk = async () => {
    const res = await fs.openFile()
    if (!res) return
    if ('binary' in res && res.binary) {
      await openFileAtPath(res.path)
      return
    }
    await openFileAtPath(res.path, res.content)
  }

  const closeTab = async (path: string): Promise<boolean> => {
    const file = openFiles.value.find((f) => f.path === path)
    if (!file) return true
    if (file.dirty) {
      const prevActive = activePath.value
      activePath.value = path
      const action = await confirmDirty(t('explorer.unsavedFile', { name: file.name }))
      if (action === 'cancel') {
        activePath.value = prevActive
        return false
      }
      if (action === 'save') {
        const ok = await saveCurrent()
        if (!ok) {
          activePath.value = prevActive
          return false
        }
      }
    }
    activePath.value = nextActiveAfterClose(openFiles.value, path, activePath.value)
    openFiles.value = closeOpenFile(openFiles.value, path)
    persistTabs()
    return true
  }

  const saveAsCurrent = async () => {
    const file = activeFile.value
    if (!file) return
    const res = await fs.saveAs(file.content, file.path)
    if (!res) return
    const oldPath = file.path
    openFiles.value = closeOpenFile(openFiles.value, oldPath)
    await openFileAtPath(res.path, file.content)
    await saveCurrent()
  }

  const onProjectOpened = async (rootPath: string) => {
    projectRoot.value = rootPath
    projectName.value = fileNameFromPath(rootPath)
    await fs.watchStop()
    await fs.watchStart(rootPath)
    const merged = await fs.settingsMergeWorkspace(rootPath)
    if (merged.ok) {
      settings.value = { ...settings.value, ...merged.config }
      applyTheme(settings.value.theme)
    }
    await fs.lspEnsureProject(rootPath)
    await restoreTabs()
  }

  const onProjectClosed = () => {
    projectRoot.value = ''
    projectName.value = ''
    void fs.watchStop()
  }

  const onFileDeleted = async (path: string) => {
    if (openFiles.value.some((f) => f.path === path)) {
      await closeTab(path)
    }
  }

  const onFileRenamed = (oldPath: string, newPath: string) => {
    const name = fileNameFromPath(newPath)
    openFiles.value = updateOpenFilePath(openFiles.value, oldPath, newPath, name)
    if (activePath.value === oldPath) activePath.value = newPath
  }

  const handleExternalFileChange = async (
    filePath: string,
    onCompare?: (diskContent: string) => void,
  ) => {
    const open = openFiles.value.find((f) => f.path === filePath)
    if (!open) return
    const { content: diskContent } = await fs.readFile(filePath)
    if (diskContent === open.content) return
    if (open.dirty) {
      const choice = await appConfirm(
        t('explorer.externalChangeDirty', {
          name: open.name,
          default: `${open.name} changed on disk. Reload and discard your edits?`,
        }),
      )
      if (!choice) return
    } else {
      const action = window.prompt(
        `${open.name} changed on disk. Enter: compare, revert, or keep`,
        'keep',
      )
      if (!action) return
      const a = action.trim().toLowerCase()
      if (a === 'compare') {
        onCompare?.(diskContent)
        return
      }
      if (a === 'keep') return
      if (a !== 'revert') return
    }
    const idx = openFiles.value.findIndex((f) => f.path === filePath)
    if (idx >= 0) {
      const next = [...openFiles.value]
      next[idx] = { ...next[idx], content: diskContent, dirty: false }
      openFiles.value = next
    }
  }

  const handleBeforeQuit = async () => {
    if (!anyDirty(openFiles.value)) {
      fs.confirmQuit()
      return
    }
    const action = await confirmDirty(t('explorer.unsavedFiles'))
    if (action === 'cancel') return
    if (action === 'save') {
      const ok = await saveAllDirty()
      if (!ok) return
    }
    fs.confirmQuit()
  }

  const bindMenu = (handlers: {
    onNewFile: () => void
    onFindInFiles: () => void
    onFind: () => void
    onToggleChat?: () => void
    onToggleAgents?: () => void
    onToggleTerminal?: () => void
    onCommandPalette?: () => void
    onQuickOpen?: () => void
  }) => {
    offMenu = fs.onMenuAction((ch) => {
      if (ch === 'menu:save') void saveCurrent()
      else if (ch === 'menu:saveAs') void saveAsCurrent()
      else if (ch === 'menu:closeTab') {
        if (activePath.value) void closeTab(activePath.value)
      }
      else if (ch === 'menu:openFile') void openFileFromDisk()
      else if (ch === 'menu:newFile') handlers.onNewFile()
      else if (ch === 'menu:findInFiles') handlers.onFindInFiles()
      else if (ch === 'menu:find') handlers.onFind()
      else if (ch === 'menu:toggleChat') handlers.onToggleChat?.()
      else if (ch === 'menu:toggleAgents') handlers.onToggleAgents?.()
      else if (ch === 'menu:toggleTerminal') handlers.onToggleTerminal?.()
      else if (ch === 'menu:commandPalette') handlers.onCommandPalette?.()
      else if (ch === 'menu:quickOpen') handlers.onQuickOpen?.()
    })
    offQuit = fs.onBeforeQuit(() => {
      void handleBeforeQuit()
    })
    offFileChanged = fs.onFileChanged((payload) => {
      if (payload.kind === 'change') {
        void handleExternalFileChange(payload.path, (disk) => {
          externalCompareHandler?.(payload.path, disk, openFiles.value.find((f) => f.path === payload.path)?.content ?? '')
        })
      }
    })
  }

  let externalCompareHandler: ((path: string, disk: string, editor: string) => void) | null = null

  const setExternalCompareHandler = (fn: ((path: string, disk: string, editor: string) => void) | null) => {
    externalCompareHandler = fn
  }

  const unbindMenu = () => {
    offMenu?.()
    offQuit?.()
    offFileChanged?.()
    offMenu = null
    offQuit = null
    offFileChanged = null
  }

  const loadSettings = async () => {
    settings.value = await fs.getSettings()
    setAppLocale(normalizeLocale(settings.value.locale))
    applyTheme(settings.value.theme)
  }

  const applySettings = async (partial: Partial<AppSettings>) => {
    settings.value = await fs.setSettings(partial)
    if (partial.locale !== undefined) {
      setAppLocale(normalizeLocale(settings.value.locale))
    }
    applyTheme(settings.value.theme)
  }

  const searchProject = async (
    query: string,
    opts?: SearchOptions,
  ): Promise<SearchHit[]> => {
    if (!projectRoot.value || !query.trim()) return []
    const { hits } = await fs.search(projectRoot.value, query, opts)
    return hits
  }

  const replaceInProject = async (
    query: string,
    replacement: string,
    opts?: SearchOptions,
  ): Promise<SearchReplaceResult> => {
    if (!projectRoot.value || !query.trim()) return { files: 0, replacements: 0 }
    return fs.searchReplace(projectRoot.value, query, replacement, opts)
  }

  const replaceOneInProject = async (
    hit: SearchHit,
    query: string,
    replacement: string,
    opts?: SearchOptions,
  ): Promise<{ ok: boolean; replacements: number }> => {
    if (!projectRoot.value || !query.trim()) return { ok: false, replacements: 0 }
    return fs.searchReplaceOne(projectRoot.value, hit, query, replacement, opts)
  }

  const setLanguageOverride = (lang: string) => {
    const path = activePath.value
    if (!path) return
    openFiles.value = openFiles.value.map((f) =>
      f.path === path ? { ...f, languageOverride: lang } : f,
    )
  }

  const setEol = (eol: 'LF' | 'CRLF') => {
    const path = activePath.value
    if (!path) return
    openFiles.value = openFiles.value.map((f) => (f.path === path ? { ...f, eol } : f))
  }

  watch(openFiles, () => persistTabs(), { deep: true })
  watch(activePath, () => persistTabs())

  const listProjectFiles = async (): Promise<string[]> => {
    if (!projectRoot.value) return []
    const { files } = await fs.listProjectFiles(projectRoot.value)
    return files
  }

  return {
    openFiles,
    activePath,
    activeFile,
    editorContent,
    projectRoot,
    projectName,
    saveStatus,
    settings,
    saveCurrent,
    saveAsCurrent,
    saveAllDirty,
    closeTab,
    openFileAtPath,
    openFileFromDisk,
    onProjectOpened,
    onProjectClosed,
    onFileDeleted,
    onFileRenamed,
    bindMenu,
    unbindMenu,
    loadSettings,
    applySettings,
    searchProject,
    replaceInProject,
    replaceOneInProject,
    listProjectFiles,
    setScmRefreshHook,
    setExternalCompareHandler,
    setLanguageOverride,
    setEol,
  }
}

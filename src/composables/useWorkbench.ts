import { ref, computed } from 'vue'
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
    agentAutoPlan: 'off',
    agentOutputStyle: 'default',
    agentCompletionSoundEnabled: false,
    agentCompletionSoundPath: '',
    agentCompletionSoundDisplayName: '',
  })

  let saveTimer: ReturnType<typeof setTimeout> | null = null
  let offMenu: (() => void) | null = null
  let offQuit: (() => void) | null = null
  let offFileChanged: (() => void) | null = null

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

  const confirmDirty = (message: string): 'save' | 'discard' | 'cancel' => {
    const choice = window.confirm(t('explorer.confirmSaveContinue', { message }))
    if (choice) return 'save'
    const discard = window.confirm(t('explorer.confirmDiscard'))
    if (discard) return 'discard'
    return 'cancel'
  }

  const openFileAtPath = async (path: string, content?: string) => {
    const existing = openFiles.value.find((f) => f.path === path)
    if (existing) {
      activePath.value = path
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
      }
    }
    openFiles.value = upsertOpenFile(openFiles.value, file)
    activePath.value = path
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
      const action = confirmDirty(t('explorer.unsavedFile', { name: file.name }))
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

  const handleExternalFileChange = async (filePath: string) => {
    const open = openFiles.value.find((f) => f.path === filePath)
    if (!open) return
    if (open.dirty) {
      if (saveTimer) {
        clearTimeout(saveTimer)
        saveTimer = null
      }
      await saveOpenFile(open)
      return
    }
    const { content } = await fs.readFile(filePath)
    if (content === open.content) return
    const idx = openFiles.value.findIndex((f) => f.path === filePath)
    if (idx >= 0) {
      const next = [...openFiles.value]
      next[idx] = { ...next[idx], content, dirty: false }
      openFiles.value = next
    }
  }

  const handleBeforeQuit = async () => {
    if (!anyDirty(openFiles.value)) {
      fs.confirmQuit()
      return
    }
    const action = confirmDirty(t('explorer.unsavedFiles'))
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
      if (payload.kind === 'change') void handleExternalFileChange(payload.path)
    })
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
    listProjectFiles,
  }
}

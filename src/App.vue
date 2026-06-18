<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import TitleBar from './components/workbench/TitleBar.vue'
import SidebarViewBar from './components/workbench/SidebarViewBar.vue'
import FileExplorer from './components/workbench/FileExplorer.vue'
import SearchPanel from './components/workbench/SearchPanel.vue'
import EditorPane from './components/workbench/EditorPane.vue'
import WelcomePage from './components/workbench/WelcomePage.vue'
import ChatPane from './components/workbench/ChatPane.vue'
import AgentsPanel from './components/workbench/AgentsPanel.vue'
import BottomPanel from './components/workbench/BottomPanel.vue'
import AiMetricsPanel from './components/workbench/AiMetricsPanel.vue'
import AiTracePanel from './components/workbench/AiTracePanel.vue'
import StatusBar from './components/workbench/StatusBar.vue'
import SettingsModal from './components/workbench/SettingsModal.vue'
import SettingsPanel from './components/workbench/SettingsPanel.vue'
import CommandPalette from './components/workbench/CommandPalette.vue'
import QuickOpenPalette from './components/workbench/QuickOpenPalette.vue'
import { useWorkbench } from './composables/useWorkbench'
import {
  clampAgentsWidth,
  clampAiPanelWidth,
  clampPanelWidth,
  clampSidebarWidth,
  minAiPanelWidth,
  WC_AGENTS_DEFAULT,
  WC_AGENTS_MIN,
  WC_AI_PANEL_DEFAULT,
  WC_CHAT_MIN,
  WC_EDITOR_MIN,
  WC_SIDEBAR_DEFAULT,
} from './utils/agents-panel'
import type {
  SearchHit,
  SearchOptions,
  SessionKind,
  WindowLayout,
  WorkbenchWindowRole,
} from './types/axecoder'
import { parseWorkbenchRoleFromLocation } from './utils/workbench-window-role'
import { applyTheme } from './utils/apply-theme'
import { applyMetricsWindowTheme } from './utils/metrics-window-theme'
import type { AppTheme } from './types/axecoder'
import { languageLabelForPath } from './utils/editor-language'
import { useI18n } from './i18n'
import { appT } from './i18n/translate'

const { t } = useI18n()

const wb = useWorkbench()
const {
  openFiles,
  activePath,
  editorContent,
  projectRoot,
  projectName,
  saveStatus,
  settings,
} = wb
const statusLanguage = computed(() => languageLabelForPath(activePath.value))

const activeActivity = ref('explorer')
const aiPanelVisible = ref(false)
const agentsSidebarVisible = ref(true)
const activeChatSessionId = ref('')
const activeSessionKind = ref<SessionKind>('agent')
const primarySidebarVisible = ref(true)
const terminalVisible = ref(false)
const metricsPanelVisible = ref(false)
const metricsDetached = ref(false)
const tracePanelVisible = ref(false)
const traceDetached = ref(false)
const bottomPanelTab = ref<'terminal' | 'output' | 'problems' | 'metrics' | 'trace'>('terminal')
const editorMode = ref<'markdown' | 'preview'>('markdown')
const cursorLine = ref(1)
const cursorCol = ref(1)
const settingsVisible = ref(false)
const settingsPanelVisible = ref(false)
const paletteVisible = ref(false)
const quickOpenVisible = ref(false)
const quickOpenPaths = ref<string[]>([])
const recentFiles = ref<string[]>([])
const recentProjects = ref<string[]>([])
const WELCOME_ON_STARTUP_KEY = 'axecoder.welcomeOnStartup'
const welcomeOnStartup = ref(true)
const windowLayout = ref<WindowLayout>({
  fullscreen: false,
  platform: typeof navigator !== 'undefined' ? navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'win32' : 'darwin',
})
const workbenchWindowRole = ref<WorkbenchWindowRole>('main')
const companionWindowOpen = ref(false)
const COMPANION_LAYOUT_REVERSED_KEY = 'axecoder.companionLayoutReversed'
const companionLayoutReversed = ref(false)
const isCompanionWindow = computed(() => workbenchWindowRole.value === 'companion')
const isMetricsWindow = computed(() => workbenchWindowRole.value === 'metrics')
const isTraceWindow = computed(() => workbenchWindowRole.value === 'trace')
const chatDetachedToCompanion = computed(
  () => !isCompanionWindow.value && companionWindowOpen.value,
)
const bottomPanelVisible = computed(
  () =>
    terminalVisible.value ||
    (metricsPanelVisible.value && !metricsDetached.value) ||
    (tracePanelVisible.value && !traceDetached.value),
)
let offWindowLayout: (() => void) | undefined
let onWindowResize: (() => void) | undefined
let offCompanionWindowState: (() => void) | undefined
let offMetricsDetached: (() => void) | undefined
let offTraceDetached: (() => void) | undefined
let offThemeChange: (() => void) | undefined

const fileExplorerRef = ref<InstanceType<typeof FileExplorer> | null>(null)
const searchPanelRef = ref<InstanceType<typeof SearchPanel> | null>(null)
const editorPaneRef = ref<InstanceType<typeof EditorPane> | null>(null)
const chatPaneRef = ref<InstanceType<typeof ChatPane> | null>(null)
const settingsPanelRef = ref<InstanceType<typeof SettingsPanel> | null>(null)
const agentsPanelRef = ref<InstanceType<typeof AgentsPanel> | null>(null)
const bottomPanelRef = ref<InstanceType<typeof BottomPanel> | null>(null)
const workbenchBodyRef = ref<HTMLElement | null>(null)
const workbenchMainRef = ref<HTMLElement | null>(null)
const aiSidePanelRef = ref<HTMLElement | null>(null)

const WC_BOTTOM_DEFAULT = 220
const WC_BOTTOM_MIN = 120

const sidebarWidth = ref(WC_SIDEBAR_DEFAULT)
const aiPanelWidth = ref(WC_AI_PANEL_DEFAULT)
const agentsWidth = ref(WC_AGENTS_DEFAULT)
const bottomPanelHeight = ref(WC_BOTTOM_DEFAULT)
const aiPanelSplitDragging = ref(false)
const agentsSplitDragging = ref(false)
const primarySplitDragging = ref(false)
const bottomSplitDragging = ref(false)

let offOpenProject: (() => void) | null = null
let offOpenProjectAt: (() => void) | null = null

const trackColumnDrag = (
  e: PointerEvent,
  onMove: (ev: PointerEvent) => void,
  onEnd: () => void,
) => {
  e.preventDefault()
  const move = (ev: PointerEvent) => onMove(ev)
  const end = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    onEnd()
  }
  const up = () => end()
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}

const hasOpenEditorTabs = computed(() => openFiles.value.length > 0)
/** Show editor only when file tabs exist; AI panel may fill center when empty */
const showEditorArea = computed(() => hasOpenEditorTabs.value)
/** Right Chat column (Agent / Workshop shared) */
const showChatAside = computed(() => aiPanelVisible.value)
/** Chat body: landing or active session; hidden when editor open with no session */
const showChatPane = computed(
  () => showChatAside.value && (!showEditorArea.value || !!activeChatSessionId.value),
)
/** Unified session list */
const showAgentsAside = computed(
  () => agentsSidebarVisible.value && showChatAside.value,
)
const showSessionAsideCore = computed(() => showChatPane.value || showAgentsAside.value)
const showSessionAside = computed(() => {
  if (isCompanionWindow.value) return true
  if (chatDetachedToCompanion.value) return false
  return showSessionAsideCore.value
})
const aiSidePanelAgentsOnly = computed(
  () => showEditorArea.value && showAgentsAside.value && !showChatPane.value,
)
/** Welcome page when no project is open */
const showWelcomePage = computed(
  () =>
    !projectRoot.value &&
    welcomeOnStartup.value &&
    !showEditorArea.value &&
    !aiPanelVisible.value,
)
const aiPanelFillsCenter = computed(
  () =>
    isCompanionWindow.value ||
    (showChatAside.value && !showWelcomePage.value && !showEditorArea.value),
)
const aiPanelUsesFixedWidth = computed(
  () =>
    showSessionAside.value &&
    !isCompanionWindow.value &&
    (showWelcomePage.value || showEditorArea.value),
)

const aiAsideMinWidth = () => {
  if (!showSessionAside.value) return 0
  if (aiSidePanelAgentsOnly.value) return agentsWidth.value
  return minAiPanelWidth(agentsSidebarVisible.value, agentsWidth.value)
}

const minCenterWorkbenchWidth = () => {
  if (showEditorArea.value) {
    return WC_EDITOR_MIN + aiAsideMinWidth()
  }
  if (showSessionAside.value) {
    return minAiPanelWidth(agentsSidebarVisible.value, agentsWidth.value)
  }
  return WC_EDITOR_MIN
}

const clampLayoutWidths = () => {
  const body = workbenchBodyRef.value
  if (body) {
    const bodyW = body.getBoundingClientRect().width
    const centerMin = minCenterWorkbenchWidth()
    sidebarWidth.value = clampSidebarWidth(sidebarWidth.value, bodyW, centerMin)
    aiPanelWidth.value = clampAiPanelWidth(
      aiPanelWidth.value,
      bodyW,
      agentsSidebarVisible.value,
      agentsWidth.value,
      WC_EDITOR_MIN,
    )
  }
  const el = aiSidePanelRef.value
  if (el) {
    agentsWidth.value = clampAgentsWidth(
      agentsWidth.value,
      el.getBoundingClientRect().width,
      WC_CHAT_MIN,
      WC_AGENTS_MIN,
    )
  }
}

const onPrimarySplitPointerDown = (e: PointerEvent) => {
  const body = workbenchBodyRef.value
  if (!body) return
  primarySplitDragging.value = true
  const startX = e.clientX
  const startW = sidebarWidth.value
  trackColumnDrag(
    e,
    (ev) => {
      const delta = ev.clientX - startX
      sidebarWidth.value = clampSidebarWidth(
        startW + delta,
        body.getBoundingClientRect().width,
        minCenterWorkbenchWidth(),
      )
    },
    () => {
      primarySplitDragging.value = false
    },
  )
}

const onAiPanelSplitPointerDown = (e: PointerEvent) => {
  const body = workbenchBodyRef.value
  if (!body) return
  aiPanelSplitDragging.value = true
  const startX = e.clientX
  if (aiSidePanelAgentsOnly.value) {
    const startW = agentsWidth.value
    const sidebar = primarySidebarVisible.value ? sidebarWidth.value : 0
    trackColumnDrag(
      e,
      (ev) => {
        const delta = ev.clientX - startX
        const maxW = body.getBoundingClientRect().width - sidebar - WC_EDITOR_MIN
        agentsWidth.value = clampPanelWidth(startW - delta, maxW, 0, WC_AGENTS_MIN)
        clampLayoutWidths()
      },
      () => {
        aiPanelSplitDragging.value = false
      },
    )
    return
  }
  const startW = aiPanelWidth.value
  trackColumnDrag(
    e,
    (ev) => {
      const delta = ev.clientX - startX
      aiPanelWidth.value = clampAiPanelWidth(
        startW - delta,
        body.getBoundingClientRect().width,
        agentsSidebarVisible.value,
        agentsWidth.value,
        WC_EDITOR_MIN,
      )
      clampLayoutWidths()
    },
    () => {
      aiPanelSplitDragging.value = false
    },
  )
}

const onAgentsSplitPointerDown = (e: PointerEvent) => {
  if (!agentsSidebarVisible.value) return
  const el = aiSidePanelRef.value
  if (!el) return
  agentsSplitDragging.value = true
  const startX = e.clientX
  const startW = agentsWidth.value
  trackColumnDrag(
    e,
    (ev) => {
      const delta = ev.clientX - startX
      agentsWidth.value = clampAgentsWidth(
        startW - delta,
        el.getBoundingClientRect().width,
        WC_CHAT_MIN,
        WC_AGENTS_MIN,
      )
    },
    () => {
      agentsSplitDragging.value = false
    },
  )
}

const clampBottomPanelHeight = (h: number, mainH: number) => {
  const max = Math.max(WC_BOTTOM_MIN, Math.floor(mainH * 0.75))
  return Math.min(max, Math.max(WC_BOTTOM_MIN, h))
}

const clampBottomPanelLayout = () => {
  const main = workbenchMainRef.value
  if (!main) return
  bottomPanelHeight.value = clampBottomPanelHeight(
    bottomPanelHeight.value,
    main.getBoundingClientRect().height,
  )
}

const onBottomSplitPointerDown = (e: PointerEvent) => {
  const main = workbenchMainRef.value
  if (!main) return
  bottomSplitDragging.value = true
  const startY = e.clientY
  const startH = bottomPanelHeight.value
  const mainH = main.getBoundingClientRect().height
  trackColumnDrag(
    e,
    (ev) => {
      const delta = startY - ev.clientY
      bottomPanelHeight.value = clampBottomPanelHeight(startH + delta, mainH)
    },
    () => {
      bottomSplitDragging.value = false
    },
  )
}

watch(hasOpenEditorTabs, () => {})

type SettingsTabId = 'general' | 'models' | 'users' | 'rules' | 'permissions' | 'mcp'

const openSettingsPanel = async (tab: SettingsTabId = 'general') => {
  await wb.loadSettings()
  settingsPanelVisible.value = true
  await nextTick()
  settingsPanelRef.value?.openTab(tab)
  if (tab === 'models') void settingsPanelRef.value?.reloadModels()
  if (tab === 'users') void settingsPanelRef.value?.reloadUsers()
  if (tab === 'rules') void settingsPanelRef.value?.reloadRules()
  if (tab === 'permissions') void settingsPanelRef.value?.reloadPermissions()
}

const openModelsSettings = () => {
  void openSettingsPanel('models')
}

const openPermissionsSettings = () => {
  void openSettingsPanel('permissions')
}

const onSettingsModelsChanged = async () => {
  await chatPaneRef.value?.loadModels()
  await chatPaneRef.value?.loadWorkshopUsers()
}

const showExplorer = () => activeActivity.value === 'explorer'
const showSearch = () => activeActivity.value === 'search'

const paletteCommands = computed(() => [
  { id: 'openProject', label: t('palette.openProject'), shortcut: '⌘O' },
  { id: 'openFile', label: t('palette.openFile'), shortcut: '⌘⇧O' },
  { id: 'newFile', label: t('palette.newFile'), shortcut: '⌘N' },
  { id: 'save', label: t('palette.save'), shortcut: '⌘S' },
  { id: 'find', label: t('palette.find'), shortcut: '⌘F' },
  { id: 'findInFiles', label: t('palette.findInProject'), shortcut: '⌘⇧F' },
  { id: 'toggleChat', label: t('palette.toggleAi'), shortcut: '' },
  { id: 'toggleAgents', label: t('palette.toggleAi'), shortcut: '' },
  { id: 'toggleTerminal', label: t('palette.toggleTerminal'), shortcut: '' },
  { id: 'toggleMetrics', label: t('titlebar.toggleMetrics'), shortcut: '' },
  { id: 'toggleTrace', label: t('titlebar.toggleTrace'), shortcut: '' },
  { id: 'settings', label: t('palette.settings'), shortcut: '' },
])

const loadRecent = async () => {
  const [filesRes, projectsRes] = await Promise.all([
    window.axecoder.getRecentFiles(),
    window.axecoder.getRecentProjects(),
  ])
  recentFiles.value = filesRes.files
  recentProjects.value = projectsRes.projects
}

const onWelcomeShowOnStartupChange = (value: boolean) => {
  welcomeOnStartup.value = value
  localStorage.setItem(WELCOME_ON_STARTUP_KEY, value ? '1' : '0')
}

const onWelcomeOpenProjectAt = async (rootPath: string) => {
  await fileExplorerRef.value?.openProjectAt(rootPath)
}

const onWelcomeOpenFile = async () => {
  await wb.openFileFromDisk()
  await loadRecent()
}

const onWelcomeNewFile = () => {
  if (!projectRoot.value) {
    triggerOpenProject()
    return
  }
  fileExplorerRef.value?.newFile()
}

const onActivitySelect = (id: string) => {
  if (activeActivity.value === id && primarySidebarVisible.value) {
    primarySidebarVisible.value = false
    return
  }
  activeActivity.value = id
  primarySidebarVisible.value = true
  if (id === 'search') setTimeout(() => searchPanelRef.value?.focusInput(), 50)
}

const toggleAiPanel = () => {
  if (chatDetachedToCompanion.value) return
  aiPanelVisible.value = !aiPanelVisible.value
}

const toggleDualWindow = async () => {
  if (isCompanionWindow.value) return
  const open = await window.axecoder.isCompanionWindowOpen()
  if (open) {
    await window.axecoder.closeCompanionWindow()
    return
  }
  aiPanelVisible.value = true
  agentsSidebarVisible.value = true
  await window.axecoder.openCompanionWindow()
}

const onChatPaneClose = () => {
  if (isCompanionWindow.value) {
    void window.axecoder.closeCompanionWindow()
    return
  }
  aiPanelVisible.value = false
}

const toggleAgentsSidebar = () => {
  agentsSidebarVisible.value = !agentsSidebarVisible.value
  nextTick(() => clampLayoutWidths())
}

const toggleCompanionLayout = () => {
  companionLayoutReversed.value = !companionLayoutReversed.value
  localStorage.setItem(
    COMPANION_LAYOUT_REVERSED_KEY,
    companionLayoutReversed.value ? '1' : '0',
  )
}

const togglePrimarySidebar = () => {
  primarySidebarVisible.value = !primarySidebarVisible.value
}

const toggleTerminal = () => {
  terminalVisible.value = !terminalVisible.value
  if (terminalVisible.value) bottomPanelTab.value = 'terminal'
}

const onMetricsDetach = () => {
  metricsDetached.value = true
  metricsPanelVisible.value = false
  void window.axecoder.openMetricsWindow()
  if (terminalVisible.value) {
    bottomPanelTab.value = 'terminal'
  } else if (tracePanelVisible.value && !traceDetached.value) {
    bottomPanelTab.value = 'trace'
  }
}

const onTraceDock = () => {
  void window.axecoder.closeTraceWindow()
}

const onTraceDetach = () => {
  traceDetached.value = true
  tracePanelVisible.value = false
  void window.axecoder.openTraceWindow()
  if (terminalVisible.value) {
    bottomPanelTab.value = 'terminal'
  } else if (metricsPanelVisible.value && !metricsDetached.value) {
    bottomPanelTab.value = 'metrics'
  }
}

const collapseBottomPanel = () => {
  const tab = bottomPanelRef.value?.tab
  if (tab) bottomPanelTab.value = tab
  terminalVisible.value = false
  metricsPanelVisible.value = false
  tracePanelVisible.value = false
}

const toggleBottomPanel = () => {
  if (bottomPanelVisible.value) {
    collapseBottomPanel()
    return
  }
  terminalVisible.value = true
}

const toggleTrace = async () => {
  if (isTraceWindow.value) return
  if (traceDetached.value) {
    const open = await window.axecoder.isTraceWindowDetached()
    if (open) {
      await window.axecoder.openTraceWindow()
      return
    }
    traceDetached.value = false
  }
  tracePanelVisible.value = !tracePanelVisible.value
  if (tracePanelVisible.value) {
    bottomPanelTab.value = 'trace'
    terminalVisible.value = false
    metricsPanelVisible.value = false
  }
}

const triggerOpenProject = () => {
  fileExplorerRef.value?.openProject()
}

const onEditorContentUpdate = (v: string) => {
  editorContent.value = v
}

const onPlanFileBuilt = async (planPath: string) => {
  const res = await window.axecoder.readFile(planPath)
  await wb.openFileAtPath(planPath, res.content)
}

const onSelectTab = (p: string) => {
  activePath.value = p
}

const onOpenFile = async (path: string) => {
  try {
    await wb.openFileAtPath(path)
    await loadRecent()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    window.alert(appT('palette.couldNotOpenFile', { path, msg }))
  }
}

const onProjectOpened = async (rootPath: string) => {
  openFiles.value = []
  activePath.value = null
  await wb.onProjectOpened(rootPath)
  aiPanelVisible.value = true
  void loadRecent()
  activeChatSessionId.value = ''
  void chatPaneRef.value?.load()
  void agentsPanelRef.value?.load()
}

/** When no project and no welcome page, open AI panel so center is not empty (user may close after opening a project). */
watch(
  () =>
    [
      projectRoot.value,
      openFiles.value.length,
      aiPanelVisible.value,
      welcomeOnStartup.value,
    ] as const,
  ([root, tabCount, aiVisible, welcome]) => {
    if (tabCount > 0 || aiVisible || root) return
    if (welcome) return
    aiPanelVisible.value = true
  },
  { immediate: true },
)

const onFileRenamed = (oldPath: string, newPath: string) => {
  wb.onFileRenamed(oldPath, newPath)
}

const onFileDeleted = async (path: string) => {
  await wb.onFileDeleted(path)
}

const onSearch = async (query: string, opts: SearchOptions, gen: number) => {
  try {
    const hits = await wb.searchProject(query, opts)
    searchPanelRef.value?.setHits(hits, gen)
  } catch {
    searchPanelRef.value?.setHits([], gen)
  }
}

const onSearchReplace = async (query: string, replacement: string, opts: SearchOptions) => {
  const ok = window.confirm(appT('searchPanel.replaceConfirm', { query }))
  if (!ok) return
  const result = await wb.replaceInProject(query, replacement, opts)
  window.alert(
    appT('searchPanel.replaceDone', {
      files: String(result.files),
      count: String(result.replacements),
    }),
  )
  const hits = await wb.searchProject(query, opts)
  searchPanelRef.value?.setHits(hits)
  fileExplorerRef.value?.refresh?.()
}

const onSearchOpen = async (hit: SearchHit) => {
  await wb.openFileAtPath(hit.file)
  editorMode.value = 'markdown'
  setTimeout(() => {
    editorPaneRef.value?.revealLine(hit.line, hit.col)
  }, 100)
}

const onFindInFiles = () => {
  activeActivity.value = 'search'
  primarySidebarVisible.value = true
  const sel = editorPaneRef.value?.getEditorSelection?.() ?? ''
  setTimeout(() => {
    if (sel.trim()) searchPanelRef.value?.setQuery(sel.trim())
    else searchPanelRef.value?.focusInput()
  }, 50)
}

const onQuickOpen = async () => {
  if (!projectRoot.value) {
    triggerOpenProject()
    return
  }
  quickOpenPaths.value = await wb.listProjectFiles()
  quickOpenVisible.value = true
}

const onQuickOpenFile = async (relPath: string) => {
  const root = projectRoot.value
  if (!root) return
  const sep = root.includes('\\') ? '\\' : '/'
  const full = `${root.replace(/[/\\]+$/, '')}${sep}${relPath.replace(/^[/\\]+/, '')}`
  await wb.openFileAtPath(full)
}

const onFind = () => {
  editorMode.value = 'markdown'
  setTimeout(() => editorPaneRef.value?.focusEditor(), 50)
}

const onSettingsSave = async (partial: Parameters<typeof wb.applySettings>[0]) => {
  await wb.applySettings(partial)
}

const onPaletteRun = (id: string) => {
  if (id === 'openProject') triggerOpenProject()
  else if (id === 'openFile') void wb.openFileFromDisk()
  else if (id === 'newFile') fileExplorerRef.value?.newFile()
  else if (id === 'save') void wb.saveCurrent()
  else if (id === 'find') onFind()
  else if (id === 'findInFiles') onFindInFiles()
  else if (id === 'toggleChat' || id === 'toggleAgents') toggleAiPanel()
  else if (id === 'toggleTerminal') toggleTerminal()
  else if (id === 'toggleMetrics') toggleBottomPanel()
  else if (id === 'toggleTrace') void toggleTrace()
  else if (id === 'settings') void openSettingsPanel('general')
}

const onNewAgentSession = async () => {
  aiPanelVisible.value = true
  await chatPaneRef.value?.newChat()
  activeChatSessionId.value = chatPaneRef.value?.activeId ?? ''
  activeSessionKind.value = chatPaneRef.value?.activeTabKind ?? 'agent'
  await agentsPanelRef.value?.load()
}

const onSelectSession = async (payload: { id: string; kind: SessionKind }) => {
  aiPanelVisible.value = true
  activeSessionKind.value = payload.kind
  activeChatSessionId.value = payload.id
  await nextTick()
  if (payload.kind === 'workshop') {
    await chatPaneRef.value?.loadWorkshop?.()
    await chatPaneRef.value?.selectWorkshopSession(payload.id)
  } else {
    await chatPaneRef.value?.selectSession(payload.id)
  }
  activeChatSessionId.value =
    chatPaneRef.value?.workshopActiveId ?? chatPaneRef.value?.activeId ?? payload.id
  activeSessionKind.value = chatPaneRef.value?.activeTabKind ?? payload.kind
}

const onDeleteSession = async (payload: { id: string; kind: SessionKind }) => {
  if (payload.kind === 'workshop') {
    await window.axecoder.deleteWorkshopSession(projectRoot.value, payload.id)
    await chatPaneRef.value?.closeWorkshopTab?.(payload.id)
    if (activeSessionKind.value === 'workshop') {
      activeChatSessionId.value = chatPaneRef.value?.workshopActiveId ?? ''
    }
  } else {
    await chatPaneRef.value?.deleteSession(payload.id)
    activeChatSessionId.value = chatPaneRef.value?.activeId ?? ''
  }
  await agentsPanelRef.value?.load()
}

const onChatActiveChange = (id: string) => {
  activeChatSessionId.value = id
}

const onChatKindChange = (kind: SessionKind) => {
  activeSessionKind.value = kind
}

const onWorkshopSessionsChanged = async () => {
  await agentsPanelRef.value?.load()
}

const onChatSessionsChanged = async () => {
  await agentsPanelRef.value?.load()
}

onMounted(async () => {
  const stored = localStorage.getItem(WELCOME_ON_STARTUP_KEY)
  welcomeOnStartup.value = stored !== '0'
  const roleFromIpc = await window.axecoder.getWindowRole()
  const roleFromHash = parseWorkbenchRoleFromLocation(window.location)
  workbenchWindowRole.value =
    roleFromIpc === 'trace' || roleFromHash === 'trace'
      ? 'trace'
      : roleFromIpc === 'metrics' || roleFromHash === 'metrics'
        ? 'metrics'
        : roleFromIpc === 'companion' || roleFromHash === 'companion'
          ? 'companion'
          : 'main'
  if (isCompanionWindow.value) {
    aiPanelVisible.value = true
    agentsSidebarVisible.value = true
    companionLayoutReversed.value =
      localStorage.getItem(COMPANION_LAYOUT_REVERSED_KEY) === '1'
  } else if (!isMetricsWindow.value && !isTraceWindow.value) {
    companionWindowOpen.value = await window.axecoder.isCompanionWindowOpen()
    metricsDetached.value = await window.axecoder.isMetricsWindowDetached()
    traceDetached.value = await window.axecoder.isTraceWindowDetached()
  }
  offCompanionWindowState = window.axecoder.onCompanionWindowState((open) => {
    companionWindowOpen.value = open
    if (!open && !isCompanionWindow.value) {
      aiPanelVisible.value = true
      nextTick(() => clampLayoutWidths())
    }
  })
  offMetricsDetached = window.axecoder.onMetricsWindowDetached((detached) => {
    metricsDetached.value = detached
    if (detached) {
      metricsPanelVisible.value = false
      if (terminalVisible.value) {
        bottomPanelTab.value = 'terminal'
      } else if (tracePanelVisible.value && !traceDetached.value) {
        bottomPanelTab.value = 'trace'
      }
    } else if (!isMetricsWindow.value) {
      metricsPanelVisible.value = true
      bottomPanelTab.value = 'metrics'
    }
  })
  offTraceDetached = window.axecoder.onTraceWindowDetached((detached) => {
    traceDetached.value = detached
    if (detached) {
      tracePanelVisible.value = false
      if (terminalVisible.value) {
        bottomPanelTab.value = 'terminal'
      } else if (metricsPanelVisible.value && !metricsDetached.value) {
        bottomPanelTab.value = 'metrics'
      }
    } else if (!isTraceWindow.value) {
      tracePanelVisible.value = true
      bottomPanelTab.value = 'trace'
    }
  })
  await wb.loadSettings()
  const applyGlobalTheme = (theme: AppTheme) => {
    if (workbenchWindowRole.value === 'metrics') {
      const effective = applyMetricsWindowTheme(theme)
      void window.axecoder.setWindowBackgroundTheme(effective)
    } else {
      settings.value = { ...settings.value, theme }
      applyTheme(theme)
    }
  }
  applyGlobalTheme(settings.value.theme)
  offThemeChange = window.axecoder.onThemeChange(applyGlobalTheme)
  await loadRecent()
  onWindowResize = () => {
    clampLayoutWidths()
    clampBottomPanelLayout()
  }
  window.addEventListener('resize', onWindowResize)
  void window.axecoder.getWindowLayout().then((layout) => {
    windowLayout.value = layout
  })
  offWindowLayout = window.axecoder.onWindowLayout((layout) => {
    windowLayout.value = layout
  })
  await nextTick()
  clampLayoutWidths()
  clampBottomPanelLayout()
  offOpenProject = window.axecoder.onOpenProject(triggerOpenProject)
  offOpenProjectAt = window.axecoder.onOpenProjectAt(onWelcomeOpenProjectAt)
  wb.bindMenu({
    onNewFile: () => fileExplorerRef.value?.newFile(),
    onFindInFiles,
    onFind,
    onToggleChat: toggleAiPanel,
    onToggleAgents: toggleAiPanel,
    onToggleTerminal: toggleTerminal,
    onCommandPalette: () => {
      paletteVisible.value = true
    },
    onQuickOpen: () => {
      void onQuickOpen()
    },
  })
})

onUnmounted(() => {
  if (onWindowResize) window.removeEventListener('resize', onWindowResize)
  offWindowLayout?.()
  offCompanionWindowState?.()
  offMetricsDetached?.()
  offTraceDetached?.()
  offThemeChange?.()
  offOpenProject?.()
  offOpenProjectAt?.()
  wb.unbindMenu()
})
</script>

<template>
  <div class="workbench">
    <TitleBar
      :primary-sidebar-visible="primarySidebarVisible"
      :ai-panel-visible="aiPanelVisible"
      :project-name="projectName"
      :window-layout="windowLayout"
      :companion-mode="isCompanionWindow"
      :metrics-mode="isMetricsWindow"
      :trace-mode="isTraceWindow"
      :dual-window-active="companionWindowOpen"
      :bottom-panel-visible="bottomPanelVisible"
      :companion-layout-reversed="companionLayoutReversed"
      @toggle-primary-sidebar="togglePrimarySidebar"
      @toggle-ai-panel="toggleAiPanel"
      @toggle-dual-window="toggleDualWindow"
      @toggle-companion-layout="toggleCompanionLayout"
      @toggle-bottom-panel="toggleBottomPanel"
      @open-project="triggerOpenProject"
      @open-model-settings="openModelsSettings"
    />
    <div ref="workbenchMainRef" class="workbench-main">
      <div
        ref="workbenchBodyRef"
        class="workbench-body"
        :class="{
          'workbench-body--companion': isCompanionWindow,
          'workbench-body--metrics': isMetricsWindow,
          'workbench-body--trace': isTraceWindow,
        }"
      >
        <div v-if="isMetricsWindow" class="metrics-window-body">
          <AiMetricsPanel
            expanded
            detached
            :global-theme="settings.theme"
          />
        </div>
        <div v-else-if="isTraceWindow" class="trace-window-body">
          <AiTracePanel expanded detached show-detach-controls @dock="onTraceDock" />
        </div>
        <template v-else>
        <div
          v-show="!isCompanionWindow && primarySidebarVisible"
          class="primary-side"
          :style="{ width: `${sidebarWidth}px` }"
        >
          <SidebarViewBar :active="activeActivity" @select="onActivitySelect" />
          <div class="sidebar-panels">
            <FileExplorer
              v-show="showExplorer()"
              ref="fileExplorerRef"
              :visible="showExplorer()"
              :active-file-path="activePath"
              @open-file="onOpenFile"
              @project-opened="onProjectOpened"
              @file-renamed="onFileRenamed"
              @file-deleted="onFileDeleted"
            />
            <SearchPanel
              v-show="showSearch()"
              ref="searchPanelRef"
              :visible="showSearch()"
              :project-name="projectName"
              @search="onSearch"
              @replace="onSearchReplace"
              @open="onSearchOpen"
            />
          </div>
        </div>
        <div
          v-show="!isCompanionWindow && primarySidebarVisible"
          class="primary-split-handle"
          :class="{ dragging: primarySplitDragging }"
          @pointerdown="onPrimarySplitPointerDown"
        />
        <WelcomePage
          v-show="!isCompanionWindow && showWelcomePage"
          :recent-projects="recentProjects"
          :recent-files="recentFiles"
          :has-project="!!projectRoot"
          :show-on-startup="welcomeOnStartup"
          @open-project="triggerOpenProject"
          @open-project-at="onWelcomeOpenProjectAt"
          @open-file="onWelcomeOpenFile"
          @new-file="onWelcomeNewFile"
          @open-recent-file="onOpenFile"
          @update:show-on-startup="onWelcomeShowOnStartupChange"
        />
        <EditorPane
          v-if="!isCompanionWindow && showEditorArea"
          ref="editorPaneRef"
          :tabs="openFiles"
          :active-path="activePath"
          :content="editorContent"
          :mode="editorMode"
          :font-size="settings.fontSize"
          :app-theme="settings.theme"
          @update:content="onEditorContentUpdate"
          @update:mode="editorMode = $event"
          @select="onSelectTab"
          @close="(p) => wb.closeTab(p)"
          @cursor-change="(l, c) => { cursorLine = l; cursorCol = c }"
        />
        <div
          v-show="!isCompanionWindow && aiPanelUsesFixedWidth"
          class="editor-ai-split-handle"
          :class="{ dragging: aiPanelSplitDragging }"
          @pointerdown="onAiPanelSplitPointerDown"
        />
        <aside
          v-show="showSessionAside"
          ref="aiSidePanelRef"
          class="ai-side-panel"
          :class="{
            'ai-side-panel--fill': aiPanelFillsCenter,
            'ai-side-panel--agents-only': aiSidePanelAgentsOnly,
            'ai-side-panel--companion': isCompanionWindow,
            'ai-side-panel--reversed':
              isCompanionWindow && companionLayoutReversed,
          }"
          :style="
            aiPanelUsesFixedWidth
              ? {
                  width: aiSidePanelAgentsOnly
                    ? `${agentsWidth}px`
                    : `${aiPanelWidth}px`,
                }
              : undefined
          "
        >
          <ChatPane
            v-show="showChatPane"
            ref="chatPaneRef"
            :session-kind="activeSessionKind"
            :project-root="projectRoot"
            :context-file-path="activePath"
            :context-file-content="editorContent"
            :has-open-editor-tabs="hasOpenEditorTabs"
            @plan-file-built="onPlanFileBuilt"
            :agents-sidebar-visible="agentsSidebarVisible"
            :agent-auto-apply-writes="settings.agentAutoApplyWrites"
            :agent-auto-plan-on="settings.agentAutoPlan !== 'off'"
            :agent-completion-sound-enabled="settings.agentCompletionSoundEnabled"
            :agent-completion-sound-path="settings.agentCompletionSoundPath"
            :profile-display-name="settings.profileDisplayName"
            :profile-avatar-path="settings.profileAvatarPath"
            @update:agent-auto-apply-writes="
              onSettingsSave({ agentAutoApplyWrites: $event })
            "
            @update:agent-auto-plan-on="
              onSettingsSave({ agentAutoPlan: $event ? 'on' : 'off' })
            "
            @close="onChatPaneClose"
            @show-agents-sidebar="agentsSidebarVisible = true"
            @open-models-settings="openModelsSettings"
            @open-permissions-settings="openPermissionsSettings"
            @active-change="onChatActiveChange"
            @kind-change="onChatKindChange"
            @sessions-changed="onChatSessionsChanged(); onWorkshopSessionsChanged()"
            @open-file="onOpenFile"
            @files-changed="fileExplorerRef?.refresh?.()"
          />
          <div
            v-show="showChatPane && showAgentsAside"
            class="agents-split-handle"
            :class="{ dragging: agentsSplitDragging }"
            @pointerdown="onAgentsSplitPointerDown"
          />
          <AgentsPanel
            ref="agentsPanelRef"
            :visible="showAgentsAside"
            :width="agentsWidth"
            :project-root="projectRoot"
            :active-session-id="activeChatSessionId"
            :active-session-kind="activeSessionKind"
            @toggle="toggleAgentsSidebar"
            @new-session="onNewAgentSession"
            @select-session="onSelectSession"
            @delete-session="onDeleteSession"
          />
        </aside>
        </template>
      </div>
      <div
        v-if="!isCompanionWindow && !isMetricsWindow && !isTraceWindow && bottomPanelVisible"
        class="bottom-split-handle"
        :class="{ dragging: bottomSplitDragging }"
        @pointerdown="onBottomSplitPointerDown"
      />
      <BottomPanel
        v-if="!isCompanionWindow && !isMetricsWindow && !isTraceWindow"
        ref="bottomPanelRef"
        :visible="bottomPanelVisible"
        :height="bottomPanelHeight"
        :project-root="projectRoot"
        :app-theme="settings.theme"
        :initial-tab="bottomPanelTab"
        :metrics-detached="metricsDetached"
        :trace-detached="traceDetached"
        @metrics-detach="onMetricsDetach"
        @trace-detach="onTraceDetach"
        @collapse="collapseBottomPanel"
      />
    </div>
    <StatusBar
      v-if="!isCompanionWindow && !isMetricsWindow && !isTraceWindow"
      :line="cursorLine"
      :col="cursorCol"
      :language="statusLanguage"
      :project-name="projectName"
      :project-root="projectRoot"
      :save-status="saveStatus"
    />
    <SettingsModal
      :visible="settingsVisible"
      :settings="settings"
      @close="settingsVisible = false"
      @save="onSettingsSave"
    />
    <SettingsPanel
      ref="settingsPanelRef"
      :visible="settingsPanelVisible"
      :settings="settings"
      :project-root="projectRoot"
      @close="settingsPanelVisible = false"
      @changed="onSettingsModelsChanged"
      @save="onSettingsSave"
    />
    <CommandPalette
      :visible="paletteVisible"
      :commands="paletteCommands"
      @close="paletteVisible = false"
      @run="onPaletteRun"
    />
    <QuickOpenPalette
      :visible="quickOpenVisible"
      :paths="quickOpenPaths"
      @close="quickOpenVisible = false"
      @open="onQuickOpenFile"
    />
  </div>
</template>

<style scoped>
.workbench {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: var(--wc-bg);
}

.workbench-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.workbench-body {
  flex: 1;
  display: flex;
  min-height: 0;
}

.workbench-body--companion .ai-side-panel--companion {
  flex: 1;
  width: 100% !important;
  max-width: none;
  min-width: 0;
}

.workbench-body--metrics {
  flex: 1;
  min-height: 0;
}

.metrics-window-body,
.trace-window-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--wc-bg);
}

.workbench-body--trace {
  flex: 1;
  min-height: 0;
}

.primary-side {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
  background: var(--wc-sidebar);
}

.sidebar-panels {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.sidebar-panels > * {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.bottom-split-handle {
  flex-shrink: 0;
  height: 5px;
  margin: -2px 0;
  cursor: row-resize;
  touch-action: none;
  user-select: none;
  position: relative;
  z-index: 1;
  background: transparent;
}

.bottom-split-handle::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 0;
  right: 0;
  height: 1px;
  background: var(--wc-border);
}

.bottom-split-handle:hover::before,
.bottom-split-handle.dragging::before {
  background: var(--wc-border-light);
}

.primary-split-handle,
.editor-ai-split-handle,
.agents-split-handle {
  flex-shrink: 0;
  width: 5px;
  margin: 0 -2px;
  cursor: col-resize;
  touch-action: none;
  user-select: none;
  position: relative;
  z-index: 1;
  background: transparent;
}

.primary-split-handle::before,
.editor-ai-split-handle::before,
.agents-split-handle::before {
  content: '';
  position: absolute;
  left: 2px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--wc-border);
}

.primary-split-handle:hover::before,
.primary-split-handle.dragging::before,
.editor-ai-split-handle:hover::before,
.editor-ai-split-handle.dragging::before,
.agents-split-handle:hover::before,
.agents-split-handle.dragging::before {
  background: var(--wc-border-light);
}

.ai-side-panel {
  display: flex;
  flex-shrink: 0;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-left: 1px solid var(--wc-workbench-separator);
}

.ai-side-panel--fill {
  flex: 1;
  width: auto;
  min-width: calc(var(--wc-chat-min) + var(--wc-agents-min));
}

.ai-side-panel--agents-only {
  flex-shrink: 0;
}

.ai-side-panel--companion.ai-side-panel--reversed {
  flex-direction: row-reverse;
}
</style>

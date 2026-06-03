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
import StatusBar from './components/workbench/StatusBar.vue'
import SettingsModal from './components/workbench/SettingsModal.vue'
import SettingsPanel from './components/workbench/SettingsPanel.vue'
import CommandPalette from './components/workbench/CommandPalette.vue'
import { useWorkbench } from './composables/useWorkbench'
import {
  clampAgentsWidth,
  clampAiPanelWidth,
  clampSidebarWidth,
  minAiPanelWidth,
  WC_AGENTS_DEFAULT,
  WC_AGENTS_MIN,
  WC_AI_PANEL_DEFAULT,
  WC_CHAT_MIN,
  WC_EDITOR_MIN,
  WC_SIDEBAR_DEFAULT,
} from './utils/agents-panel'
import type { SearchHit, SessionKind, WindowLayout } from './types/axecoder'
import { languageLabelForPath } from './utils/editor-language'

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
const editorMode = ref<'markdown' | 'preview'>('markdown')
const cursorLine = ref(1)
const cursorCol = ref(1)
const settingsVisible = ref(false)
const settingsPanelVisible = ref(false)
const paletteVisible = ref(false)
const recentFiles = ref<string[]>([])
const recentProjects = ref<string[]>([])
const WELCOME_ON_STARTUP_KEY = 'axecoder.welcomeOnStartup'
const welcomeOnStartup = ref(true)
const windowLayout = ref<WindowLayout>({
  fullscreen: false,
  platform: typeof navigator !== 'undefined' ? navigator.platform.toLowerCase().includes('mac') ? 'darwin' : 'win32' : 'darwin',
})
let offWindowLayout: (() => void) | undefined

const fileExplorerRef = ref<InstanceType<typeof FileExplorer> | null>(null)
const searchPanelRef = ref<InstanceType<typeof SearchPanel> | null>(null)
const editorPaneRef = ref<InstanceType<typeof EditorPane> | null>(null)
const chatPaneRef = ref<InstanceType<typeof ChatPane> | null>(null)
const settingsPanelRef = ref<InstanceType<typeof SettingsPanel> | null>(null)
const agentsPanelRef = ref<InstanceType<typeof AgentsPanel> | null>(null)
const bottomPanelRef = ref<InstanceType<typeof BottomPanel> | null>(null)
const workbenchBodyRef = ref<HTMLElement | null>(null)
const aiSidePanelRef = ref<HTMLElement | null>(null)

const sidebarWidth = ref(WC_SIDEBAR_DEFAULT)
const aiPanelWidth = ref(WC_AI_PANEL_DEFAULT)
const agentsWidth = ref(WC_AGENTS_DEFAULT)
const aiPanelSplitDragging = ref(false)
const agentsSplitDragging = ref(false)
const primarySplitDragging = ref(false)

let offOpenProject: (() => void) | null = null

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
/** 仅在有打开的文件标签时显示编辑区；无文件时 AI 面板可占满中间区域 */
const showEditorArea = computed(() => hasOpenEditorTabs.value)
/** 右侧 Chat 列（Agent / Workshop 共用） */
const showChatAside = computed(() => aiPanelVisible.value)
/** 统一会话列表 */
const showAgentsAside = computed(
  () => agentsSidebarVisible.value && showChatAside.value,
)
const showSessionAside = computed(() => showChatAside.value || showAgentsAside.value)
/** 欢迎页仅在没有打开项目时显示 */
const showWelcomePage = computed(
  () =>
    !projectRoot.value &&
    welcomeOnStartup.value &&
    !showEditorArea.value &&
    !aiPanelVisible.value,
)
const aiPanelFillsCenter = computed(
  () => showChatAside.value && !showWelcomePage.value && !showEditorArea.value,
)
const aiPanelUsesFixedWidth = computed(
  () => showChatAside.value && (showWelcomePage.value || showEditorArea.value),
)

const minCenterWorkbenchWidth = () => {
  if (showEditorArea.value) {
    const aiMin = showSessionAside.value
      ? minAiPanelWidth(agentsSidebarVisible.value, agentsWidth.value)
      : 0
    return WC_EDITOR_MIN + aiMin
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

watch(hasOpenEditorTabs, () => {})

const toggleWorkshop = async () => {
  aiPanelVisible.value = true
  await nextTick()
  await chatPaneRef.value?.loadWorkshop?.()
  await chatPaneRef.value?.newWorkshop()
  activeChatSessionId.value = chatPaneRef.value?.workshopActiveId ?? ''
  activeSessionKind.value = chatPaneRef.value?.activeTabKind ?? 'workshop'
  await chatPaneRef.value?.loadWorkshopUsers()
  await agentsPanelRef.value?.load()
}

type SettingsTabId = 'general' | 'models' | 'users' | 'rules'

const openSettingsPanel = async (tab: SettingsTabId = 'general') => {
  await wb.loadSettings()
  settingsPanelVisible.value = true
  await nextTick()
  settingsPanelRef.value?.openTab(tab)
  if (tab === 'models') void settingsPanelRef.value?.reloadModels()
  if (tab === 'users') void settingsPanelRef.value?.reloadUsers()
  if (tab === 'rules') void settingsPanelRef.value?.reloadRules()
}

const openModelsSettings = () => {
  void openSettingsPanel('models')
}

const onSettingsModelsChanged = async () => {
  await chatPaneRef.value?.loadModels()
  await chatPaneRef.value?.loadWorkshopUsers()
}

const showExplorer = () => activeActivity.value === 'explorer'
const showSearch = () => activeActivity.value === 'search'

const paletteCommands = [
  { id: 'openProject', label: '打开项目', shortcut: '⌘O' },
  { id: 'openFile', label: '打开文件', shortcut: '⌘⇧O' },
  { id: 'newFile', label: '新建文件', shortcut: '⌘N' },
  { id: 'save', label: '保存', shortcut: '⌘S' },
  { id: 'find', label: '查找', shortcut: '⌘F' },
  { id: 'findInFiles', label: '在项目中查找', shortcut: '⌘⇧F' },
  { id: 'toggleChat', label: '显示/隐藏 AI 面板' },
  { id: 'toggleAgents', label: '显示/隐藏 AI 面板' },
  { id: 'toggleTerminal', label: '显示/隐藏终端' },
  { id: 'settings', label: 'Settings' },
]

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
  aiPanelVisible.value = !aiPanelVisible.value
}

const toggleAgentsSidebar = () => {
  agentsSidebarVisible.value = !agentsSidebarVisible.value
  nextTick(() => clampLayoutWidths())
}

const togglePrimarySidebar = () => {
  primarySidebarVisible.value = !primarySidebarVisible.value
}

const toggleTerminal = () => {
  terminalVisible.value = !terminalVisible.value
}

const triggerOpenProject = () => {
  fileExplorerRef.value?.openProject()
}

const onEditorContentUpdate = (v: string) => {
  editorContent.value = v
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
    window.alert(`无法打开文件：\n${path}\n\n${msg}`)
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

/** 未打开项目且无欢迎页时，中间不能全空，自动打开 AI 面板（已打开项目时允许用户手动关闭） */
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

const onSearch = async (query: string) => {
  const hits = await wb.searchProject(query)
  searchPanelRef.value?.setHits(hits)
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
  setTimeout(() => searchPanelRef.value?.focusInput(), 50)
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
  else if (id === 'settings') void openSettingsPanel('general')
}

const onNewAgentSession = async () => {
  aiPanelVisible.value = true
  await chatPaneRef.value?.newChat()
  activeChatSessionId.value = chatPaneRef.value?.activeId ?? ''
  activeSessionKind.value = chatPaneRef.value?.activeTabKind ?? 'agent'
  await agentsPanelRef.value?.load()
}

const onNewWorkshopSession = async () => {
  aiPanelVisible.value = true
  await nextTick()
  await chatPaneRef.value?.loadWorkshop?.()
  await chatPaneRef.value?.newWorkshop()
  activeChatSessionId.value = chatPaneRef.value?.workshopActiveId ?? ''
  activeSessionKind.value = chatPaneRef.value?.activeTabKind ?? 'workshop'
  await chatPaneRef.value?.loadWorkshopUsers()
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
  await wb.loadSettings()
  await loadRecent()
  window.addEventListener('resize', clampLayoutWidths)
  void window.axecoder.getWindowLayout().then((layout) => {
    windowLayout.value = layout
  })
  offWindowLayout = window.axecoder.onWindowLayout((layout) => {
    windowLayout.value = layout
  })
  await nextTick()
  clampLayoutWidths()
  offOpenProject = window.axecoder.onOpenProject(triggerOpenProject)
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
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', clampLayoutWidths)
  offWindowLayout?.()
  offOpenProject?.()
  wb.unbindMenu()
})
</script>

<template>
  <div class="workbench">
    <TitleBar
      :primary-sidebar-visible="primarySidebarVisible"
      :ai-panel-visible="aiPanelVisible"
      :workshop-visible="activeSessionKind === 'workshop'"
      :project-name="projectName"
      :window-layout="windowLayout"
      @toggle-primary-sidebar="togglePrimarySidebar"
      @toggle-ai-panel="toggleAiPanel"
      @toggle-workshop="toggleWorkshop"
      @open-project="triggerOpenProject"
      @open-model-settings="openModelsSettings"
    />
    <div class="workbench-main">
      <div ref="workbenchBodyRef" class="workbench-body">
        <div
          v-show="primarySidebarVisible"
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
              @open="onSearchOpen"
            />
          </div>
        </div>
        <div
          v-show="primarySidebarVisible"
          class="primary-split-handle"
          :class="{ dragging: primarySplitDragging }"
          @pointerdown="onPrimarySplitPointerDown"
        />
        <WelcomePage
          v-show="showWelcomePage"
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
          v-if="showEditorArea"
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
          v-show="aiPanelUsesFixedWidth"
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
          }"
          :style="
            aiPanelUsesFixedWidth
              ? { width: `${aiPanelWidth}px` }
              : undefined
          "
        >
          <ChatPane
            v-show="showChatAside"
            ref="chatPaneRef"
            :session-kind="activeSessionKind"
            :project-root="projectRoot"
            :context-file-path="activePath"
            :agents-sidebar-visible="agentsSidebarVisible"
            :agent-auto-apply-writes="settings.agentAutoApplyWrites"
            :agent-completion-sound-enabled="settings.agentCompletionSoundEnabled"
            :agent-completion-sound-path="settings.agentCompletionSoundPath"
            :profile-display-name="settings.profileDisplayName"
            :profile-avatar-path="settings.profileAvatarPath"
            @update:agent-auto-apply-writes="
              onSettingsSave({ agentAutoApplyWrites: $event })
            "
            @close="aiPanelVisible = false"
            @show-agents-sidebar="agentsSidebarVisible = true"
            @open-models-settings="openModelsSettings"
            @active-change="onChatActiveChange"
            @kind-change="onChatKindChange"
            @sessions-changed="onChatSessionsChanged(); onWorkshopSessionsChanged()"
            @open-file="onOpenFile"
            @files-changed="fileExplorerRef?.refresh?.()"
          />
          <div
            v-show="showChatAside && showAgentsAside"
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
            @new-workshop="onNewWorkshopSession"
            @select-session="onSelectSession"
            @delete-session="onDeleteSession"
          />
        </aside>
      </div>
      <BottomPanel
        ref="bottomPanelRef"
        :visible="terminalVisible"
        :project-root="projectRoot"
      />
    </div>
    <StatusBar
      :line="cursorLine"
      :col="cursorCol"
      :language="statusLanguage"
      :project-name="projectName"
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
</style>

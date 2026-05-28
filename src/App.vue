<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import TitleBar from './components/workbench/TitleBar.vue'
import SidebarViewBar from './components/workbench/SidebarViewBar.vue'
import FileExplorer from './components/workbench/FileExplorer.vue'
import SearchPanel from './components/workbench/SearchPanel.vue'
import BackgroundPanel from './components/workbench/BackgroundPanel.vue'
import ExtensionsPanel from './components/workbench/ExtensionsPanel.vue'
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
import { parseMarkdownOutline } from './utils/markdown-outline'
import {
  clampAgentsWidth,
  clampAiPanelWidth,
  WC_AGENTS_DEFAULT,
  WC_AGENTS_MIN,
  WC_AI_PANEL_DEFAULT,
  WC_CHAT_MIN,
  WC_EDITOR_MIN,
} from './utils/agents-panel'
import type { SearchHit, WindowLayout } from './types/writcraft'

const wb = useWorkbench()
const projectRoot = computed(() => wb.projectRoot.value)

const activeActivity = ref('explorer')
const aiPanelVisible = ref(false)
const agentsSidebarVisible = ref(true)
const activeChatSessionId = ref('')
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
const WELCOME_ON_STARTUP_KEY = 'writcraft.welcomeOnStartup'
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
const agentsPanelRef = ref<InstanceType<typeof AgentsPanel> | null>(null)
const bottomPanelRef = ref<InstanceType<typeof BottomPanel> | null>(null)
const workbenchBodyRef = ref<HTMLElement | null>(null)
const aiSidePanelRef = ref<HTMLElement | null>(null)

const aiPanelWidth = ref(WC_AI_PANEL_DEFAULT)
const agentsWidth = ref(WC_AGENTS_DEFAULT)
const aiPanelSplitDragging = ref(false)
const agentsSplitDragging = ref(false)

let offOpenProject: (() => void) | null = null
let aiPanelSplitStartX = 0
let aiPanelSplitStartWidth = WC_AI_PANEL_DEFAULT
let agentsSplitStartX = 0
let agentsSplitStartWidth = WC_AGENTS_DEFAULT

const clampLayoutWidths = () => {
  const body = workbenchBodyRef.value
  if (body) {
    aiPanelWidth.value = clampAiPanelWidth(
      aiPanelWidth.value,
      body.getBoundingClientRect().width,
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

const onAiPanelSplitPointerDown = (e: PointerEvent) => {
  aiPanelSplitDragging.value = true
  aiPanelSplitStartX = e.clientX
  aiPanelSplitStartWidth = aiPanelWidth.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

const onAiPanelSplitPointerMove = (e: PointerEvent) => {
  if (!aiPanelSplitDragging.value) return
  const body = workbenchBodyRef.value
  if (!body) return
  const delta = e.clientX - aiPanelSplitStartX
  aiPanelWidth.value = clampAiPanelWidth(
    aiPanelSplitStartWidth - delta,
    body.getBoundingClientRect().width,
    agentsSidebarVisible.value,
    agentsWidth.value,
    WC_EDITOR_MIN,
  )
  clampLayoutWidths()
}

const onAiPanelSplitPointerUp = (e: PointerEvent) => {
  if (!aiPanelSplitDragging.value) return
  aiPanelSplitDragging.value = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* already released */
  }
}

const onAgentsSplitPointerDown = (e: PointerEvent) => {
  if (!agentsSidebarVisible.value) return
  agentsSplitDragging.value = true
  agentsSplitStartX = e.clientX
  agentsSplitStartWidth = agentsWidth.value
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

const onAgentsSplitPointerMove = (e: PointerEvent) => {
  if (!agentsSplitDragging.value) return
  const el = aiSidePanelRef.value
  if (!el) return
  const delta = e.clientX - agentsSplitStartX
  agentsWidth.value = clampAgentsWidth(
    agentsSplitStartWidth + delta,
    el.getBoundingClientRect().width,
    WC_CHAT_MIN,
    WC_AGENTS_MIN,
  )
}

const onAgentsSplitPointerUp = (e: PointerEvent) => {
  if (!agentsSplitDragging.value) return
  agentsSplitDragging.value = false
  try {
    ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
  } catch {
    /* already released */
  }
}

const outlineItems = computed(() => parseMarkdownOutline(wb.editorContent.value))
const hasOpenEditorTabs = computed(() => wb.openFiles.value.length > 0)
/** 已打开项目、编辑器标签或 AI 侧栏时不再占位欢迎页 */
const hasWorkbenchContent = computed(
  () => hasOpenEditorTabs.value || !!projectRoot.value || aiPanelVisible.value,
)
const showWelcomePage = computed(() => welcomeOnStartup.value && !hasWorkbenchContent.value)
const aiPanelFillsCenter = computed(
  () => aiPanelVisible.value && !hasOpenEditorTabs.value && !showWelcomePage.value,
)
const aiPanelUsesFixedWidth = computed(
  () => aiPanelVisible.value && (hasOpenEditorTabs.value || showWelcomePage.value),
)

const onSettingsModelsChanged = async () => {
  await chatPaneRef.value?.loadModels()
}

const showExplorer = () => activeActivity.value === 'explorer'
const showSearch = () => activeActivity.value === 'search'
const showBackground = () => activeActivity.value === 'background'
const showExtensions = () => activeActivity.value === 'extensions'

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
  { id: 'settings', label: '设置' },
]

const loadRecent = async () => {
  const [filesRes, projectsRes] = await Promise.all([
    window.writcraft.getRecentFiles(),
    window.writcraft.getRecentProjects(),
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

const onOpenFile = async (path: string) => {
  await wb.openFileAtPath(path)
  await loadRecent()
}

const onProjectOpened = async (rootPath: string) => {
  wb.openFiles.value = []
  wb.activePath.value = null
  await wb.onProjectOpened(rootPath)
  await loadRecent()
  activeChatSessionId.value = ''
  await chatPaneRef.value?.load()
  await agentsPanelRef.value?.load()
}

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

const onOutlineJump = (line: number) => {
  editorMode.value = 'markdown'
  setTimeout(() => editorPaneRef.value?.revealLine(line, 1), 50)
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
  else if (id === 'settings') settingsVisible.value = true
}

const onNewAgentSession = async () => {
  aiPanelVisible.value = true
  await chatPaneRef.value?.newChat()
  if (chatPaneRef.value?.activeId) activeChatSessionId.value = chatPaneRef.value.activeId
  await agentsPanelRef.value?.load()
}

const onSelectAgentSession = async (id: string) => {
  aiPanelVisible.value = true
  await nextTick()
  const ok = await chatPaneRef.value?.selectSession(id)
  if (ok) activeChatSessionId.value = chatPaneRef.value?.activeId ?? id
}

const onDeleteAgentSession = async (id: string) => {
  await chatPaneRef.value?.deleteSession(id)
  activeChatSessionId.value = chatPaneRef.value?.activeId ?? ''
  await agentsPanelRef.value?.load()
}

const onChatActiveChange = (id: string) => {
  activeChatSessionId.value = id
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
  void window.writcraft.getWindowLayout().then((layout) => {
    windowLayout.value = layout
  })
  offWindowLayout = window.writcraft.onWindowLayout((layout) => {
    windowLayout.value = layout
  })
  await nextTick()
  clampLayoutWidths()
  offOpenProject = window.writcraft.onOpenProject(triggerOpenProject)
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
      :project-name="wb.projectName.value"
      :window-layout="windowLayout"
      @toggle-primary-sidebar="togglePrimarySidebar"
      @toggle-ai-panel="toggleAiPanel"
      @open-project="triggerOpenProject"
      @open-model-settings="settingsPanelVisible = true"
    />
    <div class="workbench-main">
      <div ref="workbenchBodyRef" class="workbench-body">
        <div v-show="primarySidebarVisible" class="primary-side">
          <SidebarViewBar :active="activeActivity" @select="onActivitySelect" />
          <div class="sidebar-panels">
          <FileExplorer
            v-show="showExplorer()"
            ref="fileExplorerRef"
            :visible="showExplorer()"
            :active-file-path="wb.activePath.value"
            :outline-items="outlineItems"
            :recent-files="recentFiles"
            @open-file="onOpenFile"
            @project-opened="onProjectOpened"
            @file-renamed="onFileRenamed"
            @file-deleted="onFileDeleted"
            @outline-jump="onOutlineJump"
          />
          <SearchPanel
            v-show="showSearch()"
            ref="searchPanelRef"
            :visible="showSearch()"
            :project-name="wb.projectName.value"
            @search="onSearch"
            @open="onSearchOpen"
          />
          <BackgroundPanel
            v-show="showBackground()"
            :visible="showBackground()"
            :project-root="projectRoot"
            @open-file="onOpenFile"
          />
          <ExtensionsPanel v-show="showExtensions()" :visible="showExtensions()" />
          </div>
        </div>
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
          v-show="hasOpenEditorTabs"
          ref="editorPaneRef"
          :tabs="wb.openFiles.value"
          :active-path="wb.activePath.value"
          :content="wb.editorContent.value"
          :mode="editorMode"
          :font-size="wb.settings.value.fontSize"
          :app-theme="wb.settings.value.theme"
          @update:content="(v) => (wb.editorContent.value = v)"
          @update:mode="editorMode = $event"
          @select="(p) => (wb.activePath.value = p)"
          @close="(p) => wb.closeTab(p)"
          @cursor-change="(l, c) => { cursorLine = l; cursorCol = c }"
        />
        <div
          v-show="aiPanelUsesFixedWidth"
          class="editor-ai-split-handle"
          :class="{ dragging: aiPanelSplitDragging }"
          @pointerdown="onAiPanelSplitPointerDown"
          @pointermove="onAiPanelSplitPointerMove"
          @pointerup="onAiPanelSplitPointerUp"
          @pointercancel="onAiPanelSplitPointerUp"
        />
        <aside
          v-show="aiPanelVisible"
          ref="aiSidePanelRef"
          class="ai-side-panel"
          :class="{ 'ai-side-panel--fill': aiPanelFillsCenter }"
          :style="aiPanelUsesFixedWidth ? { width: `${aiPanelWidth}px` } : undefined"
        >
          <ChatPane
            ref="chatPaneRef"
            :project-root="projectRoot"
            :context-file-path="wb.activePath.value"
            :agents-sidebar-visible="agentsSidebarVisible"
            @close="aiPanelVisible = false"
            @show-agents-sidebar="agentsSidebarVisible = true"
            @open-models-settings="settingsPanelVisible = true"
            @active-change="onChatActiveChange"
            @sessions-changed="onChatSessionsChanged"
            @files-changed="fileExplorerRef?.refresh?.()"
          />
          <div
            v-show="agentsSidebarVisible"
            class="agents-split-handle"
            :class="{ dragging: agentsSplitDragging }"
            @pointerdown="onAgentsSplitPointerDown"
            @pointermove="onAgentsSplitPointerMove"
            @pointerup="onAgentsSplitPointerUp"
            @pointercancel="onAgentsSplitPointerUp"
          />
          <AgentsPanel
            ref="agentsPanelRef"
            :visible="agentsSidebarVisible"
            :width="agentsWidth"
            :project-root="projectRoot"
            :active-session-id="activeChatSessionId"
            @toggle="toggleAgentsSidebar"
            @new-session="onNewAgentSession"
            @select-session="onSelectAgentSession"
            @delete-session="onDeleteAgentSession"
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
      language="Markdown"
      :project-name="wb.projectName.value"
      :save-status="wb.saveStatus.value"
    />
    <SettingsModal
      :visible="settingsVisible"
      :settings="wb.settings.value"
      @close="settingsVisible = false"
      @save="onSettingsSave"
    />
    <SettingsPanel
      :visible="settingsPanelVisible"
      :settings="wb.settings.value"
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
  width: var(--wc-sidebar-w);
  min-height: 0;
  background: var(--wc-sidebar);
  border-right: 1px solid var(--wc-border);
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
}

.ai-side-panel--fill {
  flex: 1;
  width: auto;
  min-width: calc(var(--wc-chat-min) + var(--wc-agents-min));
}
</style>

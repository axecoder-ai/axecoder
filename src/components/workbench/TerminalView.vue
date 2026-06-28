<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { AppTheme } from '../../types/axecoder'
import { terminalThemeFor } from '../../utils/terminal-theme'
import { terminalCustomKeyHandlerAllowsXterm } from '../../../shared/terminal-readline-keys'

const props = defineProps<{
  projectRoot: string
  active: boolean
  appTheme?: AppTheme
}>()

const container = ref<HTMLElement | null>(null)
const tabIds = ref<string[]>([])
const activeTabId = ref('')
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let offData: (() => void) | null = null
let offFocus: (() => void) | null = null
let resizeObserver: ResizeObserver | null = null
const sessionReady = ref(false)

const fitAndResize = () => {
  if (!fitAddon || !term || !props.active || !activeTabId.value) return
  fitAddon.fit()
  const dims = fitAddon.proposeDimensions()
  if (dims && sessionReady.value) {
    void window.axecoder.terminalResize(dims.cols, dims.rows, activeTabId.value)
  }
}

const attachResizeObserver = () => {
  if (!container.value || resizeObserver) return
  resizeObserver = new ResizeObserver(() => fitAndResize())
  resizeObserver.observe(container.value)
}

const detachResizeObserver = () => {
  resizeObserver?.disconnect()
  resizeObserver = null
}

const loadTabs = async () => {
  const res = await window.axecoder.terminalList()
  if (res.ok) {
    tabIds.value = res.tabs.length ? res.tabs : []
    activeTabId.value = res.activeTabId || tabIds.value[0] || ''
  }
}

const createTab = async () => {
  fitAddon?.fit()
  const dims = fitAddon?.proposeDimensions()
  const cols = dims?.cols ?? 80
  const rows = dims?.rows ?? 24
  const res = await window.axecoder.terminalCreate(props.projectRoot || '', cols, rows)
  if (!res.ok) {
    term?.writeln(`\r\n[Terminal failed: ${res.error}]\r\n`)
    return
  }
  tabIds.value = [...tabIds.value, res.tabId]
  activeTabId.value = res.tabId
  await window.axecoder.terminalSetActive(res.tabId)
  sessionReady.value = true
  term?.clear()
  term?.focus()
}

const closeTab = async (tabId: string) => {
  await window.axecoder.terminalClose(tabId)
  tabIds.value = tabIds.value.filter((id) => id !== tabId)
  if (activeTabId.value === tabId) {
    activeTabId.value = tabIds.value[tabIds.value.length - 1] ?? ''
    if (activeTabId.value) await window.axecoder.terminalSetActive(activeTabId.value)
    else sessionReady.value = false
  }
}

const selectTab = async (tabId: string) => {
  activeTabId.value = tabId
  await window.axecoder.terminalSetActive(tabId)
  term?.clear()
  term?.focus()
  fitAndResize()
}

const ensureFirstTab = async () => {
  await loadTabs()
  if (!tabIds.value.length) {
    await createTab()
    return
  }
  if (!activeTabId.value) activeTabId.value = tabIds.value[0]!
  await window.axecoder.terminalSetActive(activeTabId.value)
  sessionReady.value = true
}

const initXterm = () => {
  if (!container.value || term) return
  term = new Terminal({
    fontFamily: 'JetBrains Mono, Menlo, Monaco, monospace',
    fontSize: 12,
    lineHeight: 1.2,
    cursorBlink: true,
    scrollback: 5000,
    theme: terminalThemeFor(props.appTheme ?? 'vscode'),
  })
  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(container.value)
  fitAddon.fit()

  term.onData((data) => {
    void window.axecoder.terminalWrite(data, activeTabId.value || undefined)
  })

  term.attachCustomKeyEventHandler((ev) => terminalCustomKeyHandlerAllowsXterm(ev))

  const el = container.value
  const onFocusIn = () => void window.axecoder.terminalSetFocused(true)
  const onFocusOut = () => void window.axecoder.terminalSetFocused(false)
  el.addEventListener('focusin', onFocusIn)
  el.addEventListener('focusout', onFocusOut)
  offFocus = () => {
    el.removeEventListener('focusin', onFocusIn)
    el.removeEventListener('focusout', onFocusOut)
  }

  offData = window.axecoder.onTerminalData(({ tabId, text }) => {
    if (tabId === activeTabId.value) term?.write(text)
  })
}

const boot = async () => {
  await nextTick()
  if (!props.active || !container.value) return
  initXterm()
  attachResizeObserver()
  await ensureFirstTab()
  fitAndResize()
}

const disposeXterm = () => {
  void window.axecoder.terminalSetFocused(false)
  detachResizeObserver()
  offData?.()
  offData = null
  offFocus?.()
  offFocus = null
  term?.dispose()
  term = null
  fitAddon = null
}

onMounted(() => {
  if (props.active) void boot()
})

watch(
  () => props.active,
  async (active) => {
    if (!active) {
      void window.axecoder.terminalSetFocused(false)
      detachResizeObserver()
      return
    }
    await boot()
    fitAndResize()
    term?.focus()
  },
)

watch(
  () => props.projectRoot,
  async () => {
    if (!props.active || !term) return
    tabIds.value = []
    activeTabId.value = ''
    term.clear()
    await ensureFirstTab()
    fitAndResize()
  },
)

watch(
  () => props.appTheme,
  (theme) => {
    if (!term || !theme) return
    term.options.theme = terminalThemeFor(theme)
  },
)

onUnmounted(() => {
  disposeXterm()
})
</script>

<template>
  <div class="terminal-wrap">
    <div class="term-tabs">
      <button
        v-for="id in tabIds"
        :key="id"
        type="button"
        class="term-tab"
        :class="{ active: id === activeTabId }"
        @click="selectTab(id)"
      >
        bash
        <span class="close" @click.stop="closeTab(id)">×</span>
      </button>
      <button type="button" class="term-tab new" title="New terminal" @click="createTab">+</button>
    </div>
    <div ref="container" class="terminal-view" />
  </div>
</template>

<style scoped>
.terminal-wrap {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 120px;
}

.term-tabs {
  display: flex;
  align-items: stretch;
  height: 26px;
  background: var(--wc-bg-dark);
  border-bottom: 1px solid var(--wc-border);
  flex-shrink: 0;
  overflow-x: auto;
}

.term-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  font-size: 11px;
  color: var(--wc-text-muted);
  border-right: 1px solid var(--wc-border);
  flex-shrink: 0;
}

.term-tab.active {
  color: var(--wc-text);
  background: var(--wc-panel);
}

.term-tab.new {
  min-width: 28px;
  justify-content: center;
}

.close {
  opacity: 0.6;
  font-size: 13px;
}

.close:hover {
  opacity: 1;
}

.terminal-view {
  flex: 1;
  min-height: 0;
  padding: 4px 0;
  box-sizing: border-box;
  background: var(--wc-panel);
}

.terminal-view :deep(.xterm) {
  height: 100%;
}

.terminal-view :deep(.xterm-viewport) {
  overflow-y: auto !important;
}
</style>

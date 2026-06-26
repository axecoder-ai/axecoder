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
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let offData: (() => void) | null = null
let offFocus: (() => void) | null = null
let resizeObserver: ResizeObserver | null = null
let sessionReady = false

const fitAndResize = () => {
  if (!fitAddon || !term || !props.active) return
  fitAddon.fit()
  const dims = fitAddon.proposeDimensions()
  if (dims && sessionReady) {
    void window.axecoder.terminalResize(dims.cols, dims.rows)
  }
}

const attachResizeObserver = () => {
  if (!container.value || resizeObserver) return
  resizeObserver = new ResizeObserver(() => {
    fitAndResize()
  })
  resizeObserver.observe(container.value)
}

const detachResizeObserver = () => {
  resizeObserver?.disconnect()
  resizeObserver = null
}

const startTerminal = async () => {
  if (!container.value || !term) return
  fitAddon?.fit()
  const dims = fitAddon?.proposeDimensions()
  const cols = dims?.cols ?? 80
  const rows = dims?.rows ?? 24
  const result = await window.axecoder.terminalStart(props.projectRoot || '', cols, rows)
  if (!result.ok) {
    term.writeln(`\r\n[Terminal failed to start: ${result.error}]\r\n`)
    return
  }
  sessionReady = true
  term.focus()
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
    void window.axecoder.terminalWrite(data)
  })

  term.attachCustomKeyEventHandler((ev) => terminalCustomKeyHandlerAllowsXterm(ev))

  const el = container.value
  const onFocusIn = () => {
    void window.axecoder.terminalSetFocused(true)
  }
  const onFocusOut = () => {
    void window.axecoder.terminalSetFocused(false)
  }
  el.addEventListener('focusin', onFocusIn)
  el.addEventListener('focusout', onFocusOut)
  offFocus = () => {
    el.removeEventListener('focusin', onFocusIn)
    el.removeEventListener('focusout', onFocusOut)
  }

  offData = window.axecoder.onTerminalData((data) => {
    term?.write(data)
  })
}

const boot = async () => {
  await nextTick()
  if (!props.active || !container.value) return
  initXterm()
  attachResizeObserver()
  await startTerminal()
  fitAndResize()
}

const stopTerminal = () => {
  sessionReady = false
  void window.axecoder.terminalStop()
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
    term.clear()
    stopTerminal()
    await startTerminal()
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
  <div ref="container" class="terminal-view" />
</template>

<style scoped>
.terminal-view {
  width: 100%;
  height: 100%;
  min-height: 120px;
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

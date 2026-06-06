<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'
import type { AppTheme } from '../../types/axecoder'
import { terminalThemeFor } from '../../utils/terminal-theme'

const props = defineProps<{
  projectRoot: string
  active: boolean
  appTheme?: AppTheme
}>()

const container = ref<HTMLElement | null>(null)
let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let offData: (() => void) | null = null
let resizeObserver: ResizeObserver | null = null
let started = false

const fitAndResize = () => {
  if (!fitAddon || !term) return
  fitAddon.fit()
  const dims = fitAddon.proposeDimensions()
  if (dims && started) {
    void window.axecoder.terminalResize(dims.cols, dims.rows)
  }
}

const startTerminal = async () => {
  if (!container.value || !term || started) return
  fitAddon?.fit()
  const dims = fitAddon?.proposeDimensions()
  const cols = dims?.cols ?? 80
  const rows = dims?.rows ?? 24
  const result = await window.axecoder.terminalStart(props.projectRoot || '', cols, rows)
  if (!result.ok) {
    term.writeln(`\r\n[Terminal failed to start: ${result.error}]\r\n`)
    return
  }
  started = true
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

  offData = window.axecoder.onTerminalData((data) => {
    term?.write(data)
  })

  resizeObserver = new ResizeObserver(() => {
    fitAndResize()
  })
  resizeObserver.observe(container.value)
}

const boot = async () => {
  await nextTick()
  if (!props.active || !container.value) return
  initXterm()
  await startTerminal()
  fitAndResize()
}

const stopTerminal = () => {
  started = false
  void window.axecoder.terminalStop()
}

const disposeXterm = () => {
  offData?.()
  offData = null
  resizeObserver?.disconnect()
  resizeObserver = null
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
    if (active) {
      await boot()
    } else if (started) {
      stopTerminal()
    }
  },
)

watch(
  () => props.projectRoot,
  async () => {
    if (!props.active || !term) return
    term.clear()
    stopTerminal()
    await startTerminal()
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
  stopTerminal()
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

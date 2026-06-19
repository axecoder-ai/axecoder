<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  xml: string
}>()

const emit = defineEmits<{
  exportXml: [xml: string]
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)
let resizeObserver: ResizeObserver | undefined
let fitTimer: ReturnType<typeof setTimeout> | undefined
let themeObs: MutationObserver | undefined

const DRAWIO_ORIGIN = 'https://embed.diagrams.net'

const isDarkTheme = () => document.documentElement.getAttribute('data-theme') !== 'aura-light'
const dark = ref(isDarkTheme())

const iframeSrc = computed(() => {
  const params = new URLSearchParams({
    embed: '1',
    ui: dark.value ? 'dark' : 'min',
    spin: '0',
    modified: 'unsavedChanges',
    proto: 'json',
    grid: '0',
    pv: '0',
    pages: '0',
    noSaveBtn: '1',
    noExitBtn: '1',
    saveAndExit: '0',
    libraries: '0',
    format: '0',
    sidebar: '0',
    splash: '0',
    gh: '0',
    gl: '0',
  })
  if (dark.value) params.set('dark', '1')
  return `${DRAWIO_ORIGIN}/?${params}`
})

const fitDiagram = () => {
  const win = iframeRef.value?.contentWindow
  if (!win || !ready.value) return
  win.postMessage(JSON.stringify({ action: 'fit', border: 4, maxScale: 2 }), DRAWIO_ORIGIN)
}

const scheduleFit = () => {
  if (fitTimer) clearTimeout(fitTimer)
  fitTimer = setTimeout(() => fitDiagram(), 80)
}

const loadXml = (xml: string) => {
  const win = iframeRef.value?.contentWindow
  if (!win || !xml.trim()) return
  win.postMessage(
    JSON.stringify({
      action: 'load',
      xml,
      autosave: 1,
      fit: 1,
      maxFitScale: 2,
      noSaveBtn: 1,
      noExitBtn: 1,
    }),
    DRAWIO_ORIGIN,
  )
  scheduleFit()
}

const onMessage = (ev: MessageEvent) => {
  if (ev.origin !== DRAWIO_ORIGIN) return
  let data: { event?: string; xml?: string } | null = null
  try {
    data = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data
  } catch {
    return
  }
  if (!data || typeof data !== 'object') return
  if (data.event === 'init') {
    ready.value = true
    loadXml(props.xml)
    return
  }
  if (data.event === 'export' && typeof data.xml === 'string' && data.xml.trim()) {
    emit('exportXml', data.xml)
  }
}

watch(
  () => props.xml,
  (xml) => {
    if (ready.value) loadXml(xml)
  },
)

onMounted(() => {
  window.addEventListener('message', onMessage)
  const el = iframeRef.value
  if (el) {
    resizeObserver = new ResizeObserver(() => scheduleFit())
    resizeObserver.observe(el)
  }
  themeObs = new MutationObserver(() => {
    const next = isDarkTheme()
    if (next !== dark.value) {
      dark.value = next
      ready.value = false
    }
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})

onUnmounted(() => {
  window.removeEventListener('message', onMessage)
  resizeObserver?.disconnect()
  themeObs?.disconnect()
  if (fitTimer) clearTimeout(fitTimer)
})
</script>

<template>
  <iframe
    ref="iframeRef"
    :key="dark ? 'dark' : 'light'"
    class="draw-io-embed"
    :src="iframeSrc"
    title="draw.io"
    allow="clipboard-write"
  />
</template>

<style scoped>
.draw-io-embed {
  display: block;
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  border: none;
  background: var(--wc-bg);
  /* 裁掉 embed 底部 GitHub 按钮区域，不用遮罩避免盖住图表 */
  clip-path: inset(0 0 28px 0);
}
</style>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { resolveWorkbenchShellUrl } from '../../utils/workbench-webview-url'
import {
  attachParentAxecoderBridge,
  callWebviewMethod,
  parseBridgeMessage,
} from '../../utils/workbench-webview-bridge'

const props = defineProps<{
  viewId: string
  entry: string
  visible: boolean
}>()

const emit = defineEmits<{
  event: [name: string, payload?: unknown]
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
let detachBridge: (() => void) | undefined

const shellUrl = computed(() => {
  if (import.meta.env.DEV) {
    return resolveWorkbenchShellUrl(props.entry, {
      devServerUrl: `${window.location.origin}/`,
    })
  }
  return resolveWorkbenchShellUrl(props.entry, { basePath: './' })
})

const onIframeMessage = (ev: MessageEvent) => {
  const iframe = iframeRef.value
  if (!iframe || ev.source !== iframe.contentWindow) return
  const msg = parseBridgeMessage(ev.data)
  if (!msg || msg.channel !== 'webview:event') return
  if (msg.viewId !== props.viewId) return
  emit('event', msg.name, msg.payload)
}

onMounted(() => {
  window.addEventListener('message', onIframeMessage)
  watch(
    iframeRef,
    (el, _old, onCleanup) => {
      detachBridge?.()
      detachBridge = undefined
      if (!el) return
      detachBridge = attachParentAxecoderBridge(el, window.axecoder as unknown as Record<string, unknown>)
      onCleanup(() => detachBridge?.())
    },
    { immediate: true },
  )
})

onUnmounted(() => {
  window.removeEventListener('message', onIframeMessage)
  detachBridge?.()
})

const call = (method: string, args: unknown[] = []) => {
  const el = iframeRef.value
  if (!el) return Promise.reject(new Error('webview not ready'))
  return callWebviewMethod(el, props.viewId, method, args)
}

defineExpose({ call })
</script>

<template>
  <iframe
    v-show="visible"
    ref="iframeRef"
    class="workbench-webview"
    :src="shellUrl"
    :title="viewId"
    sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
  />
</template>

<style scoped>
.workbench-webview {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: none;
  background: var(--wc-sidebar);
}
</style>

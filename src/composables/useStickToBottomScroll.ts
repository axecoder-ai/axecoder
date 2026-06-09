import { nextTick, ref } from 'vue'

const DEFAULT_THRESHOLD = 80

export function useStickToBottomScroll(threshold = DEFAULT_THRESHOLD) {
  const scrollEl = ref<HTMLElement | null>(null)
  const stickToBottom = ref(true)
  let rafId: number | null = null

  const onScrollContainer = () => {
    const el = scrollEl.value
    if (!el) return
    stickToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < threshold
  }

  const scrollToBottom = async (force = false) => {
    if (force) stickToBottom.value = true
    else if (!stickToBottom.value) return
    await nextTick()
    const el = scrollEl.value
    if (!el) return
    if (rafId !== null) cancelAnimationFrame(rafId)
    rafId = requestAnimationFrame(() => {
      if (stickToBottom.value) el.scrollTop = el.scrollHeight
      rafId = null
    })
  }

  return { scrollEl, stickToBottom, onScrollContainer, scrollToBottom }
}

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = withDefaults(
  defineProps<{
    color?: string
  }>(),
  {
    color: '#dd7657',
  },
)

// 与 claude-code SpinnerGlyph 一致：小点 → 雪花 → 再收回
const FRAMES = ['·', '✢', '✳', '✶', '✻', '✽', ...[...['·', '✢', '✳', '✶', '✻', '✽']].reverse()] as const

const frame = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  timer = setInterval(() => {
    frame.value = (frame.value + 1) % FRAMES.length
  }, 120)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const glyph = computed(() => FRAMES[frame.value]!)

const bloom = computed(() => {
  const mid = (FRAMES.length - 1) / 2
  return 1 - Math.abs(frame.value - mid) / mid
})
</script>

<template>
  <span
    class="agent-spinner-glyph"
    aria-hidden="true"
    :style="{
      color: props.color,
      opacity: String(0.38 + bloom * 0.62),
      transform: `scale(${0.78 + bloom * 0.42})`,
    }"
  >{{ glyph }}</span>
</template>

<style scoped>
.agent-spinner-glyph {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  font-size: 11px;
  line-height: 1;
  transform-origin: center center;
  transition: opacity 0.1s ease, transform 0.1s ease;
  user-select: none;
}
</style>

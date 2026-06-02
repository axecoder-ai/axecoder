<script setup lang="ts">
import { ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: boolean
    active?: boolean
    disabled?: boolean
    title?: string
  }>(),
  { disabled: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  change: [value: boolean]
}>()

/** 外部配置 → 展示（与 Rules 页 .switch 一致） */
const lit = ref(false)

const readProp = () => {
  if (props.modelValue !== undefined) return !!props.modelValue
  if (props.active !== undefined) return !!props.active
  return false
}

watch(() => [props.modelValue, props.active] as const, () => {
  lit.value = readProp()
}, { immediate: true })

const toggle = () => {
  if (props.disabled) return
  const next = !lit.value
  lit.value = next
  emit('update:modelValue', next)
  emit('change', next)
}
</script>

<template>
  <button
    type="button"
    class="ax-switch"
    :class="{ 'ax-switch--on': lit }"
    :disabled="disabled"
    role="switch"
    :aria-checked="lit"
    :title="title"
    @click.stop="toggle"
  />
</template>

<style scoped>
.ax-switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 10px;
  vertical-align: middle;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.ax-switch::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 2px;
  width: 16px;
  height: 16px;
  margin-top: -8px;
  border-radius: 50%;
  background: var(--wc-text-muted);
  transition: left 0.15s ease, background 0.15s ease;
}

.ax-switch--on {
  background: #3fa66b;
  border-color: #3fa66b;
}

.ax-switch--on::after {
  left: 18px;
  background: #fff;
}

.ax-switch:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>

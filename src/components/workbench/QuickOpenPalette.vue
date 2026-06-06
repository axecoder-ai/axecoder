<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useI18n } from '../../i18n'
import { fuzzyFilterPaths } from '../../utils/quick-open-fuzzy'

const props = defineProps<{
  visible: boolean
  paths: string[]
}>()

const emit = defineEmits<{
  close: []
  open: [relPath: string]
}>()

const { t } = useI18n()
const query = ref('')
const selected = ref(0)
const inputRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => fuzzyFilterPaths(query.value, props.paths, 50))

watch(
  () => props.visible,
  (v) => {
    if (v) {
      query.value = ''
      selected.value = 0
      nextTick(() => inputRef.value?.focus())
    }
  },
)

watch(filtered, () => {
  selected.value = 0
})

const runSelected = () => {
  const p = filtered.value[selected.value]
  if (!p) return
  emit('open', p)
  emit('close')
}

const onKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('close')
    return
  }
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    selected.value = Math.min(selected.value + 1, filtered.value.length - 1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    selected.value = Math.max(selected.value - 1, 0)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    runSelected()
  }
}
</script>

<template>
  <div v-if="visible" class="palette-backdrop" @click.self="emit('close')">
    <div class="palette" @keydown="onKeydown">
      <input
        ref="inputRef"
        v-model="query"
        class="palette-input"
        :placeholder="t('quickOpen.placeholder')"
        @keydown="onKeydown"
      />
      <ul class="palette-list">
        <li
          v-for="(p, i) in filtered"
          :key="p"
          :class="{ selected: i === selected }"
          @click="selected = i; runSelected()"
        >
          <span class="path">{{ p }}</span>
        </li>
        <li v-if="!filtered.length" class="empty">{{ t('quickOpen.empty') }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  justify-content: center;
  padding-top: 80px;
  z-index: 200;
}

.palette {
  width: 560px;
  max-height: 420px;
  background: var(--wc-bg-dark);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.palette-input {
  width: 100%;
  padding: 14px 16px;
  font-size: 14px;
  border-bottom: 1px solid var(--wc-border);
  background: var(--wc-input-bg);
}

.palette-list {
  list-style: none;
  overflow: auto;
  max-height: 340px;
}

.palette-list li {
  padding: 8px 16px;
  font-size: 13px;
  cursor: pointer;
}

.palette-list li.selected,
.palette-list li:hover {
  background: var(--wc-active);
}

.path {
  font-family: var(--wc-font-mono);
  font-size: 12px;
}

.empty {
  color: var(--wc-text-muted);
  cursor: default;
}
</style>

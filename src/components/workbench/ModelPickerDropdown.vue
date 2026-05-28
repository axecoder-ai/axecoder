<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import type { ModelEntry } from '../../types/writcraft'

const props = defineProps<{
  models: ModelEntry[]
  activeModelId: string
}>()

const emit = defineEmits<{
  select: [id: string]
  addModels: []
}>()

const open = ref(false)
const search = ref('')
const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const popoverLeft = ref(0)
const popoverBottom = ref(0)
const POPOVER_W = 260

const activeModel = computed(
  () => props.models.find((m) => m.id === props.activeModelId) ?? null,
)

const triggerLabel = computed(() => activeModel.value?.name ?? '选择模型')

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.models
  return props.models.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.modelId.toLowerCase().includes(q),
  )
})

const syncPopoverPos = () => {
  const el = triggerRef.value
  if (!el) return
  const r = el.getBoundingClientRect()
  const maxLeft = window.innerWidth - POPOVER_W - 8
  popoverLeft.value = Math.max(8, Math.min(r.left, maxLeft))
  popoverBottom.value = window.innerHeight - r.top + 8
}

const toggle = () => {
  open.value = !open.value
  if (open.value) {
    search.value = ''
    void nextTick(syncPopoverPos)
  }
}

watch(open, (v) => {
  if (v) void nextTick(syncPopoverPos)
})

const pick = (id: string) => {
  emit('select', id)
  open.value = false
}

const onAdd = () => {
  open.value = false
  emit('addModels')
}

const onDocClick = (e: MouseEvent) => {
  if (!open.value) return
  const t = e.target as Node
  if (rootRef.value?.contains(t)) return
  if (popoverRef.value?.contains(t)) return
  open.value = false
}

const onKey = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && open.value) open.value = false
}

const onResize = () => {
  if (open.value) syncPopoverPos()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('keydown', onKey)
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocClick)
  document.removeEventListener('keydown', onKey)
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div ref="rootRef" class="picker-root">
    <Teleport to="body">
      <div
        v-if="open"
        ref="popoverRef"
        class="popover"
        :style="{ left: `${popoverLeft}px`, bottom: `${popoverBottom}px` }"
      >
        <div class="search-wrap">
          <input
            v-model="search"
            type="search"
            class="search-input"
            placeholder="搜索模型"
            @click.stop
          />
        </div>
        <ul v-if="filtered.length" class="model-list">
          <li v-for="m in filtered" :key="m.id">
            <button type="button" class="model-row" @click="pick(m.id)">
              <span class="model-name">{{ m.name }}</span>
              <svg
                v-if="m.id === activeModelId"
                class="check"
                viewBox="0 0 16 16"
                width="14"
                height="14"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.75.75 0 0 1 1.06-1.06L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0z"
                />
              </svg>
            </button>
          </li>
        </ul>
        <p v-else class="empty">无匹配模型</p>
        <button type="button" class="add-row" @click="onAdd">
          <span class="add-icon">+</span>
          添加模型
        </button>
      </div>
    </Teleport>
    <button ref="triggerRef" type="button" class="trigger" :class="{ open }" @click="toggle">
      <span class="trigger-label">{{ triggerLabel }}</span>
      <svg class="chevron" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4.427 6.427a.75.75 0 0 1 1.06-.02L8 8.88l2.513-2.473a.75.75 0 1 1 1.04 1.08l-3.02 2.96a.75.75 0 0 1-1.04 0l-3.02-2.96a.75.75 0 0 1-.02-1.06z"
        />
      </svg>
    </button>
  </div>
</template>

<style scoped>
.picker-root {
  position: relative;
  display: inline-flex;
}

.trigger {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  margin: 0;
  border: none;
  background: transparent;
  color: var(--wc-text-muted);
  font-size: 12px;
  line-height: 1.4;
  border-radius: 6px;
  cursor: pointer;
  max-width: 180px;
}

.trigger:hover,
.trigger.open {
  color: var(--wc-text);
  background: var(--wc-muted-surface);
}

.trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chevron {
  flex-shrink: 0;
  opacity: 0.65;
}

.trigger.open .chevron {
  transform: rotate(180deg);
}

.popover {
  position: fixed;
  width: 260px;
  background: var(--wc-popover-bg);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  box-shadow: var(--wc-popover-shadow);
  z-index: 10000;
  overflow: hidden;
}

.search-wrap {
  padding: 8px 10px;
  border-bottom: 1px solid var(--wc-border);
}

.search-input {
  width: 100%;
  padding: 6px 8px;
  font-size: 12px;
  background: var(--wc-input-bg);
  border: 1px solid transparent;
  border-radius: 6px;
  color: var(--wc-text);
}

.search-input::placeholder {
  color: var(--wc-text-dim);
}

.search-input:focus {
  outline: none;
  border-color: var(--wc-border);
}

.model-list {
  list-style: none;
  margin: 0;
  padding: 4px 0;
  max-height: 220px;
  overflow-y: auto;
}

.model-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  text-align: left;
  font-size: 13px;
  color: var(--wc-text);
  background: transparent;
  border: none;
  cursor: pointer;
}

.model-row:hover {
  background: var(--wc-hover);
}

.model-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 8px;
}

.check {
  flex-shrink: 0;
  color: var(--wc-text);
}

.empty {
  margin: 0;
  padding: 12px;
  font-size: 12px;
  color: var(--wc-text-dim);
  text-align: center;
}

.add-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--wc-text-muted);
  background: transparent;
  border: none;
  border-top: 1px solid var(--wc-border);
  cursor: pointer;
  text-align: left;
}

.add-row:hover {
  background: var(--wc-hover);
  color: var(--wc-text);
}

.add-icon {
  font-size: 14px;
  line-height: 1;
  opacity: 0.8;
}
</style>

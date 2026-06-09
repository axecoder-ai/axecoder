<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { atPickerContext, rolesForAtPicker } from '../../utils/at-ref-picker'
import type { UserEntry } from '../../types/axecoder'

export type AtRefDirEntry = { name: string; isDir: boolean }

type PickerRow =
  | { kind: 'role'; user: UserEntry }
  | { kind: 'file'; entry: AtRefDirEntry }

const props = defineProps<{
  projectRoot: string
  inputText: string
  cursor: number
  anchorEl: HTMLElement | null
  mentionUsers?: UserEntry[]
}>()

const emit = defineEmits<{
  pickRole: [user: UserEntry, replaceStart: number]
  pickFile: [insertPath: string, replaceStart: number]
}>()

const POPOVER_W = 360
const activeIdx = ref(0)
const popoverLeft = ref(0)
const popoverBottom = ref(0)
const fileEntries = ref<AtRefDirEntry[]>([])
const loading = ref(false)

const users = computed(() => props.mentionUsers ?? [])

const ctx = computed(() => atPickerContext(props.inputText, props.cursor, users.value))

const filteredRoles = computed(() =>
  rolesForAtPicker(props.inputText, props.cursor, users.value),
)

const filteredFiles = computed(() => {
  const c = ctx.value
  if (!c || !props.projectRoot.trim()) return []
  const q = c.partial.toLowerCase()
  return fileEntries.value.filter((e) => e.name.toLowerCase().startsWith(q))
})

const rows = computed((): PickerRow[] => {
  const out: PickerRow[] = []
  for (const user of filteredRoles.value) out.push({ kind: 'role', user })
  for (const entry of filteredFiles.value) out.push({ kind: 'file', entry })
  return out
})

const visible = computed(() => !!ctx.value && !!props.projectRoot.trim())

const isOpen = computed(() => visible.value && rows.value.length > 0)

const activeRow = computed(() => rows.value[activeIdx.value] ?? null)

const loadFiles = async () => {
  const c = ctx.value
  if (!c || !props.projectRoot.trim()) {
    fileEntries.value = []
    return
  }
  loading.value = true
  try {
    const res = await window.axecoder.listAtRefDir(props.projectRoot, c.relDir)
    fileEntries.value = res.ok ? res.entries : []
  } catch {
    fileEntries.value = []
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.inputText, props.cursor, visible.value] as const,
  () => {
    activeIdx.value = 0
    if (visible.value) void loadFiles()
  },
)

const syncPopoverPos = () => {
  const el = props.anchorEl
  if (!el) return
  const r = el.getBoundingClientRect()
  const maxLeft = window.innerWidth - POPOVER_W - 8
  popoverLeft.value = Math.max(8, Math.min(r.left, maxLeft))
  popoverBottom.value = window.innerHeight - r.top + 8
}

watch(visible, (v) => {
  if (v) void nextTick(syncPopoverPos)
})

const onResize = () => {
  if (visible.value) syncPopoverPos()
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const pickRow = (row: PickerRow) => {
  const c = ctx.value
  if (!c) return
  if (row.kind === 'role') {
    emit('pickRole', row.user, c.replaceStart)
    return
  }
  const base = c.relDir
  const name = row.entry.isDir ? `${row.entry.name}/` : row.entry.name
  emit('pickFile', `@${base}${name}`, c.replaceStart)
}

const moveActive = (delta: number) => {
  const len = rows.value.length
  if (!len) return
  activeIdx.value = (activeIdx.value + delta + len) % len
}

const pickActive = () => {
  const row = activeRow.value
  if (row) pickRow(row)
}

defineExpose({ isOpen, moveActive, pickActive })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="at-ref-picker"
      :style="{ left: `${popoverLeft}px`, bottom: `${popoverBottom}px`, width: `${POPOVER_W}px` }"
    >
      <template v-if="filteredRoles.length">
        <div class="section-label">角色</div>
        <button
          v-for="(u, i) in filteredRoles"
          :key="'r-' + u.id"
          type="button"
          class="at-ref-row"
          :class="{ active: activeIdx === i }"
          @click="pickRow({ kind: 'role', user: u })"
          @mouseenter="activeIdx = i"
        >
          <span class="at-ref-icon role">@</span>
          <span class="at-ref-name">{{ u.displayName }}</span>
          <span class="at-ref-hint">{{ u.role }}</span>
        </button>
      </template>
      <template v-if="filteredFiles.length">
        <div class="section-label">{{ filteredRoles.length ? '文件' : '@ 引用' }}</div>
        <button
          v-for="(e, fi) in filteredFiles"
          :key="'f-' + e.name"
          type="button"
          class="at-ref-row"
          :class="{ active: activeIdx === filteredRoles.length + fi }"
          @mouseenter="activeIdx = filteredRoles.length + fi"
          @click="pickRow({ kind: 'file', entry: e })"
        >
          <span class="at-ref-icon">{{ e.isDir ? '📁' : '📄' }}</span>
          <span class="at-ref-name">{{ e.name }}{{ e.isDir ? '/' : '' }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>

<style scoped>
.at-ref-picker {
  position: fixed;
  background: var(--wc-popover-bg);
  border: 1px solid var(--wc-border);
  border-radius: 10px;
  box-shadow: var(--wc-popover-shadow);
  z-index: 10000;
  overflow-y: auto;
  max-height: 320px;
  padding: 6px 0;
}

.section-label {
  padding: 4px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--wc-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.at-ref-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 12px;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 13px;
  color: var(--wc-text);
}

.at-ref-row:hover,
.at-ref-row.active {
  background: var(--wc-muted-surface);
}

.at-ref-icon {
  font-size: 14px;
  opacity: 0.85;
  flex-shrink: 0;
}

.at-ref-icon.role {
  font-weight: 700;
  color: var(--wc-accent, #4a9eff);
}

.at-ref-name {
  font-family: ui-monospace, monospace;
  font-size: 12px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.at-ref-hint {
  font-size: 11px;
  color: var(--wc-text-dim);
  flex-shrink: 0;
}
</style>

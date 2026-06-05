<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import type { UserEntry } from '../../types/axecoder'
import { filterUsersForMention, roleMentionPickerQuery } from '../../utils/role-mention'

const props = defineProps<{
  inputText: string
  users: UserEntry[]
  anchorEl: HTMLElement | null
}>()

const emit = defineEmits<{
  select: [user: UserEntry]
}>()

const POPOVER_W = 360
const DETAIL_W = 200

const activeIdx = ref(0)
const popoverLeft = ref(0)
const popoverBottom = ref(0)

const query = computed(() => roleMentionPickerQuery(props.inputText, props.users) ?? '')

const visible = computed(() => roleMentionPickerQuery(props.inputText, props.users) !== null)

const filtered = computed(() => filterUsersForMention(props.users, query.value))

const activeItem = computed(() => filtered.value[activeIdx.value] ?? null)

const isOpen = computed(() => visible.value && filtered.value.length > 0)

const commandHint = (u: UserEntry) =>
  u.skillSlugs?.length ? u.skillSlugs.map((s) => `/${s}`).join(' · ') : ''

const syncPopoverPos = () => {
  const el = props.anchorEl
  if (!el) return
  const r = el.getBoundingClientRect()
  const maxLeft = window.innerWidth - POPOVER_W - 8
  popoverLeft.value = Math.max(8, Math.min(r.left, maxLeft))
  popoverBottom.value = window.innerHeight - r.top + 8
}

watch(
  () => [props.inputText, visible.value] as const,
  () => {
    activeIdx.value = 0
    if (visible.value) void nextTick(syncPopoverPos)
  },
)

watch(visible, (v) => {
  if (v) void nextTick(syncPopoverPos)
})

const onResize = () => {
  if (visible.value) syncPopoverPos()
}

onMounted(() => window.addEventListener('resize', onResize))
onUnmounted(() => window.removeEventListener('resize', onResize))

const pick = (user: UserEntry) => emit('select', user)

const moveActive = (delta: number) => {
  const len = filtered.value.length
  if (!len) return
  activeIdx.value = (activeIdx.value + delta + len) % len
}

const pickActive = () => {
  const item = activeItem.value
  if (item) pick(item)
}

defineExpose({ isOpen, moveActive, pickActive })
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible && filtered.length"
      class="role-picker"
      :style="{ left: `${popoverLeft}px`, bottom: `${popoverBottom}px`, width: `${POPOVER_W}px` }"
    >
      <div v-if="activeItem" class="role-picker-detail" :style="{ width: `${DETAIL_W}px` }">
        <div class="detail-name">@{{ activeItem.displayName }}</div>
        <div class="detail-role">{{ activeItem.role }}</div>
        <div v-if="activeItem.expertise" class="detail-desc">{{ activeItem.expertise }}</div>
        <div v-if="commandHint(activeItem)" class="detail-cmds">{{ commandHint(activeItem) }}</div>
      </div>
      <div class="role-picker-list">
        <div class="section-label">Roles</div>
        <button
          v-for="(u, i) in filtered"
          :key="u.id"
          type="button"
          class="role-row"
          :class="{ active: activeIdx === i }"
          @click="pick(u)"
          @mouseenter="activeIdx = i"
        >
          <span class="role-name">@{{ u.displayName }}</span>
          <span class="role-meta">{{ u.role }}</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.role-picker {
  position: fixed;
  display: flex;
  background: var(--wc-popover-bg);
  border: 1px solid var(--wc-border);
  border-radius: 10px;
  box-shadow: var(--wc-popover-shadow);
  z-index: 10000;
  overflow: hidden;
  max-height: 320px;
}

.role-picker-detail {
  flex-shrink: 0;
  padding: 12px 14px;
  border-right: 1px solid var(--wc-border);
  background: var(--wc-muted-surface);
  overflow-y: auto;
}

.detail-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--wc-text);
  margin-bottom: 4px;
}

.detail-role {
  font-size: 12px;
  color: var(--wc-text-muted);
  margin-bottom: 6px;
}

.detail-desc {
  font-size: 12px;
  line-height: 1.45;
  color: var(--wc-text-muted);
}

.detail-cmds {
  margin-top: 8px;
  font-size: 11px;
  font-family: ui-monospace, monospace;
  color: var(--wc-text-dim);
}

.role-picker-list {
  flex: 1;
  min-width: 0;
  overflow-y: auto;
  padding: 6px 0;
}

.section-label {
  padding: 4px 12px 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--wc-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.role-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  width: 100%;
  padding: 6px 12px;
  text-align: left;
  background: transparent;
  border: none;
  cursor: pointer;
}

.role-row:hover,
.role-row.active {
  background: var(--wc-hover);
}

.role-name {
  font-size: 13px;
  color: var(--wc-text);
}

.role-meta {
  font-size: 11px;
  color: var(--wc-text-dim);
}
</style>

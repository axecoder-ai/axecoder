<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { allSlashCommands } from '../../slash-commands/registry'
import type { SlashCommandDef } from '../../slash-commands/types'

const props = defineProps<{
  inputText: string
  anchorEl: HTMLElement | null
}>()

const emit = defineEmits<{
  select: [name: string]
}>()

const DEFAULT_LIMIT = 3
const POPOVER_W = 420
const DETAIL_W = 200

const skillExpanded = ref(false)
const commandExpanded = ref(false)
const activeIdx = ref(0)
const popoverRef = ref<HTMLElement | null>(null)
const popoverLeft = ref(0)
const popoverBottom = ref(0)

const isSkill = (c: SlashCommandDef) => c.description.startsWith('Run skill: ')

const query = computed(() => {
  const t = props.inputText
  if (!t.startsWith('/')) return ''
  const rest = t.slice(1)
  const sp = rest.indexOf(' ')
  if (sp >= 0) return rest.slice(0, sp).toLowerCase()
  return rest.toLowerCase()
})

const visible = computed(() => {
  const t = props.inputText
  if (!t.startsWith('/')) return false
  const rest = t.slice(1)
  if (rest.includes(' ')) return false
  return true
})

const filtered = computed(() => {
  const q = query.value
  const all = allSlashCommands()
  if (!q) return all
  return all.filter((c) => {
    if (c.name.includes(q)) return true
    return c.aliases?.some((a) => a.toLowerCase().includes(q)) ?? false
  })
})

const skills = computed(() => filtered.value.filter(isSkill))
const commands = computed(() => filtered.value.filter((c) => !isSkill(c)))

const visibleSkills = computed(() => {
  const list = skills.value
  if (skillExpanded.value || list.length <= DEFAULT_LIMIT) return list
  return list.slice(0, DEFAULT_LIMIT)
})

const visibleCommands = computed(() => {
  const list = commands.value
  if (commandExpanded.value || list.length <= DEFAULT_LIMIT) return list
  return list.slice(0, DEFAULT_LIMIT)
})

const hiddenSkillCount = computed(() =>
  skillExpanded.value ? 0 : Math.max(0, skills.value.length - DEFAULT_LIMIT),
)
const hiddenCommandCount = computed(() =>
  commandExpanded.value ? 0 : Math.max(0, commands.value.length - DEFAULT_LIMIT),
)

const flatList = computed(() => [...visibleSkills.value, ...visibleCommands.value])

const activeItem = computed(() => flatList.value[activeIdx.value] ?? null)

const isOpen = computed(() => visible.value && flatList.value.length > 0)

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
    skillExpanded.value = false
    commandExpanded.value = false
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

const pick = (name: string) => emit('select', name)

const moveActive = (delta: number) => {
  const len = flatList.value.length
  if (!len) return
  activeIdx.value = (activeIdx.value + delta + len) % len
}

const pickActive = () => {
  const item = activeItem.value
  if (item) pick(item.name)
}

defineExpose({
  isOpen,
  moveActive,
  pickActive,
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="visible && flatList.length"
      ref="popoverRef"
      class="slash-picker"
      :style="{ left: `${popoverLeft}px`, bottom: `${popoverBottom}px`, width: `${POPOVER_W}px` }"
    >
      <div
        v-if="activeItem"
        class="slash-picker-detail"
        :style="{ width: `${DETAIL_W}px` }"
      >
        <div class="detail-name">/{{ activeItem.name }}</div>
        <div class="detail-desc">{{ activeItem.description }}</div>
      </div>
      <div class="slash-picker-list">
        <template v-if="visibleSkills.length">
          <div class="section-label">Skills</div>
          <button
            v-for="(c, i) in visibleSkills"
            :key="'s-' + c.name"
            type="button"
            class="slash-row"
            :class="{ active: activeIdx === i }"
            @click="pick(c.name)"
            @mouseenter="activeIdx = i"
          >
            <span class="slash-name">/{{ c.name }}</span>
          </button>
          <button
            v-if="hiddenSkillCount > 0"
            type="button"
            class="show-more"
            @click="skillExpanded = true"
          >
            Show {{ hiddenSkillCount }} more
          </button>
        </template>
        <template v-if="visibleCommands.length">
          <div class="section-label">Commands</div>
          <button
            v-for="(c, i) in visibleCommands"
            :key="'c-' + c.name"
            type="button"
            class="slash-row"
            :class="{ active: activeIdx === visibleSkills.length + i }"
            @click="pick(c.name)"
            @mouseenter="activeIdx = visibleSkills.length + i"
          >
            <span class="slash-name">/{{ c.name }}</span>
            <span class="slash-desc">{{ c.description }}</span>
          </button>
          <button
            v-if="hiddenCommandCount > 0"
            type="button"
            class="show-more"
            @click="commandExpanded = true"
          >
            Show {{ hiddenCommandCount }} more
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.slash-picker {
  position: fixed;
  display: flex;
  background: var(--wc-popover-bg);
  border: 1px solid var(--wc-border);
  border-radius: 10px;
  box-shadow: var(--wc-popover-shadow);
  z-index: 10000;
  overflow: hidden;
  max-height: 360px;
}

.slash-picker-detail {
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
  margin-bottom: 8px;
}

.detail-desc {
  font-size: 12px;
  line-height: 1.5;
  color: var(--wc-text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.slash-picker-list {
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

.slash-row {
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

.slash-row:hover,
.slash-row.active {
  background: var(--wc-hover);
}

.slash-name {
  font-size: 13px;
  color: var(--wc-text);
}

.slash-desc {
  font-size: 11px;
  color: var(--wc-text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.show-more {
  display: block;
  width: 100%;
  padding: 6px 12px;
  font-size: 12px;
  color: var(--wc-text-dim);
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
}

.show-more:hover {
  color: var(--wc-text-muted);
  background: var(--wc-hover);
}
</style>

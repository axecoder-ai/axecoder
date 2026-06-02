<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { RuleDetail, RuleListItem, RuleScope } from '../../types/axecoder'
import { fileNameFromPath } from '../../composables/workbench-state'
import RuleFormDialog from './RuleFormDialog.vue'

const emit = defineEmits<{
  changed: []
}>()

type FilterId = 'all' | 'user' | 'project'

const rules = ref<RuleListItem[]>([])
const projectRoot = ref<string | null>(null)
const filter = ref<FilterId>('all')
const thirdPartyImport = ref(false)
const formVisible = ref(false)
const editing = ref<RuleDetail | null>(null)
const showAllRules = ref(false)
const loading = ref(false)

const RULES_COLLAPSE = 5

const filteredRules = computed(() => {
  if (filter.value === 'user') return rules.value.filter((r) => r.scope === 'user')
  if (filter.value === 'project') return rules.value.filter((r) => r.scope === 'project')
  return rules.value
})

const visibleRules = computed(() => {
  const list = filteredRules.value
  if (showAllRules.value || list.length <= RULES_COLLAPSE) return list
  return list.slice(0, RULES_COLLAPSE)
})

const hiddenRulesCount = computed(() => {
  const n = filteredRules.value.length - RULES_COLLAPSE
  return showAllRules.value || n <= 0 ? 0 : n
})

const defaultScope = computed((): RuleScope =>
  filter.value === 'project' ? 'project' : 'user',
)

const projectTabLabel = computed(() =>
  projectRoot.value ? fileNameFromPath(projectRoot.value) : '项目',
)

const scopeLabel = (r: RuleListItem) =>
  r.scope === 'user' ? 'User' : projectTabLabel.value

const reload = async () => {
  loading.value = true
  try {
    const root = await window.axecoder.getLastProject()
    projectRoot.value = root
    const res = await window.axecoder.listRules(root)
    if (!res.ok) {
      alert(res.error)
      return
    }
    rules.value = res.data.rules
    projectRoot.value = res.data.projectRoot
    const imp = await window.axecoder.getRulesThirdPartyImport()
    if (imp.ok) thirdPartyImport.value = imp.enabled
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void reload()
})

const setFilter = (id: FilterId) => {
  filter.value = id
  showAllRules.value = false
}

const onThirdPartyToggle = async () => {
  const next = !thirdPartyImport.value
  const res = await window.axecoder.setRulesThirdPartyImport(next)
  if (!res.ok) {
    alert(res.error)
    return
  }
  thirdPartyImport.value = next
}

const openNew = () => {
  if (filter.value === 'project' && !projectRoot.value) {
    alert('请先打开项目以创建项目规则')
    return
  }
  editing.value = null
  formVisible.value = true
}

const openEdit = async (item: RuleListItem) => {
  const res = await window.axecoder.readRule(
    item.scope,
    item.fileName,
    item.scope === 'project' ? projectRoot.value ?? undefined : undefined,
  )
  if (!res.ok) {
    alert(res.error)
    return
  }
  editing.value = res.data
  formVisible.value = true
}

const onSaved = async (payload: {
  scope: RuleScope
  fileName: string
  description: string
  alwaysApply: boolean
  globs: string
  body: string
  isNew: boolean
}) => {
  const res = await window.axecoder.saveRule({
    scope: payload.scope,
    fileName: payload.fileName,
    description: payload.description,
    alwaysApply: payload.alwaysApply,
    globs: payload.globs || undefined,
    body: payload.body,
    projectRoot: payload.scope === 'project' ? projectRoot.value ?? undefined : undefined,
    isNew: payload.isNew,
  })
  if (!res.ok) {
    alert(res.error)
    return
  }
  rules.value = res.data.rules
  projectRoot.value = res.data.projectRoot
  emit('changed')
}

const onDelete = async (item: RuleListItem) => {
  if (!confirm(`删除规则「${item.description}」？`)) return
  const res = await window.axecoder.deleteRule(
    item.scope,
    item.fileName,
    item.scope === 'project' ? projectRoot.value ?? undefined : undefined,
  )
  if (!res.ok) {
    alert(res.error)
    return
  }
  rules.value = res.data.rules
  emit('changed')
}

defineExpose({ reload })
</script>

<template>
  <div class="rules-skills-tab">
    <h2>Rules, Skills, Subagents</h2>
    <p class="page-desc">Provide domain-specific knowledge and workflows for the agent.</p>

    <div class="filter-row">
      <button
        type="button"
        class="pill"
        :class="{ active: filter === 'all' }"
        @click="setFilter('all')"
      >
        All
      </button>
      <button
        type="button"
        class="pill"
        :class="{ active: filter === 'user' }"
        @click="setFilter('user')"
      >
        User
      </button>
      <button
        type="button"
        class="pill"
        :class="{ active: filter === 'project' }"
        @click="setFilter('project')"
      >
        {{ projectTabLabel }}
      </button>
    </div>

    <div class="toggle-card">
      <div class="toggle-text">
        <span class="toggle-title">Include third-party Plugins, Skills, and other configs</span>
        <span class="toggle-sub">Automatically import agent configs from other tools（V1 占位，尚未导入）</span>
      </div>
      <button
        type="button"
        class="switch"
        :class="{ on: thirdPartyImport }"
        role="switch"
        :aria-checked="thirdPartyImport"
        @click="onThirdPartyToggle"
      />
    </div>

    <section class="block">
      <header class="block-head">
        <div>
          <h3>Rules <span class="info" title="Rules guide agent behavior">ⓘ</span></h3>
          <p class="block-desc">
            Use Rules to guide agent behavior, like enforcing best practices or coding standards.
            Rules can be applied always, by file path, or manually.
          </p>
        </div>
        <button type="button" class="new-btn" @click="openNew">+ New</button>
      </header>
      <div v-if="loading" class="empty">Loading…</div>
      <div v-else-if="visibleRules.length" class="rule-list">
        <div
          v-for="r in visibleRules"
          :key="`${r.scope}:${r.fileName}`"
          class="rule-row"
          @click="openEdit(r)"
        >
          <div class="rule-main">
            <span class="rule-title">{{ r.description }}</span>
            <span class="rule-meta">{{ scopeLabel(r) }} · {{ r.fileName }}</span>
          </div>
          <div class="rule-actions" @click.stop>
            <button type="button" class="link" @click="openEdit(r)">Edit</button>
            <button type="button" class="link danger" @click="onDelete(r)">Delete</button>
          </div>
        </div>
        <button
          v-if="hiddenRulesCount > 0"
          type="button"
          class="show-all"
          @click="showAllRules = true"
        >
          Show all ({{ hiddenRulesCount }} more)
        </button>
      </div>
      <p v-else class="empty">No rules yet. Create one with + New.</p>
      <p v-if="filter === 'project' && !projectRoot" class="warn">
        未打开项目：仅显示用户规则；项目规则需先打开工作区。
      </p>
    </section>

    <section class="block block-muted">
      <header class="block-head">
        <div>
          <h3>Skills <span class="info">ⓘ</span></h3>
          <p class="block-desc">
            Skills are specialized capabilities that help the agent accomplish specific tasks.
            Coming in a future release.
          </p>
        </div>
        <button type="button" class="new-btn" disabled>+ New</button>
      </header>
    </section>

    <section class="block block-muted">
      <header class="block-head">
        <div>
          <h3>Subagents <span class="info">ⓘ</span></h3>
          <p class="block-desc">Configure specialized subagents. Coming in a future release.</p>
        </div>
        <button type="button" class="new-btn" disabled>+ New</button>
      </header>
    </section>

    <RuleFormDialog
      :visible="formVisible"
      :editing="editing"
      :project-root="projectRoot"
      :default-scope="defaultScope"
      @close="formVisible = false"
      @save="onSaved"
    />
  </div>
</template>

<style scoped>
.rules-skills-tab {
  box-sizing: border-box;
  width: 100%;
  padding: 24px 32px 48px;
}

h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}

.page-desc {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--wc-text-dim);
}

.filter-row {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
}

.pill {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 999px;
  border: 1px solid var(--wc-border);
  color: var(--wc-text-muted);
  background: transparent;
}

.pill.active {
  background: var(--wc-hover);
  color: var(--wc-text);
  border-color: var(--wc-border-strong, var(--wc-border));
}

.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  margin-bottom: 28px;
  background: var(--wc-bg-dark);
}

.toggle-title {
  display: block;
  font-size: 13px;
  font-weight: 500;
}

.toggle-sub {
  display: block;
  font-size: 12px;
  color: var(--wc-text-dim);
  margin-top: 4px;
}

.switch {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  position: relative;
  flex-shrink: 0;
}

.switch::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--wc-text-muted);
  transition: transform 0.15s ease;
}

.switch.on {
  background: #3fa66b;
  border-color: #3fa66b;
}

.switch.on::after {
  transform: translateX(20px);
  background: #fff;
}

.block {
  margin-bottom: 28px;
}

.block-muted {
  opacity: 0.65;
}

.block-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 12px;
}

.block-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}

.info {
  font-size: 12px;
  color: var(--wc-text-dim);
  font-weight: 400;
}

.block-desc {
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--wc-text-dim);
  line-height: 1.45;
}

.new-btn {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--wc-border);
  color: var(--wc-text);
  flex-shrink: 0;
}

.new-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.rule-list {
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  overflow: hidden;
  background: var(--wc-bg-dark);
}

.rule-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--wc-border);
  cursor: pointer;
}

.rule-row:last-of-type {
  border-bottom: none;
}

.rule-row:hover {
  background: var(--wc-hover);
}

.rule-title {
  display: block;
  font-size: 13px;
}

.rule-meta {
  display: block;
  font-size: 11px;
  color: var(--wc-text-dim);
  margin-top: 2px;
}

.rule-actions {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.link {
  font-size: 12px;
  color: var(--wc-text-muted);
  background: none;
  padding: 0;
}

.link.danger:hover {
  color: #f48771;
}

.show-all {
  display: block;
  width: 100%;
  padding: 10px;
  font-size: 12px;
  color: var(--wc-text-muted);
  background: none;
  border-top: 1px solid var(--wc-border);
}

.show-all:hover {
  color: var(--wc-text);
  background: var(--wc-hover);
}

.empty,
.warn {
  font-size: 13px;
  color: var(--wc-text-dim);
}

.warn {
  margin-top: 10px;
  color: #d4a574;
}
</style>

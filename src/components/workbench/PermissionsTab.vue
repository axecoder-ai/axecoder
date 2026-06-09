<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from '../../i18n'
import type { PermissionDecision, PermissionsPolicy, PermissionsView } from '../../types/axecoder'

const props = defineProps<{
  projectRoot?: string
}>()

const { t } = useI18n()

const scope = ref<'global' | 'project'>('global')
const view = ref<PermissionsView | null>(null)
const busy = ref(false)
const status = ref('')
const jsonText = ref('')
const drafts = ref<Record<'deny' | 'ask' | 'allow', string>>({ deny: '', ask: '', allow: '' })

const globalMode = ref<'default' | 'acceptEdits' | 'bypassPermissions'>('default')
const projectMode = ref<PermissionDecision>('ask')

const activePolicy = computed((): PermissionsPolicy | null => {
  if (!view.value) return null
  return scope.value === 'global' ? view.value.global : view.value.project
})

const activePath = computed(() => {
  if (!view.value) return ''
  return scope.value === 'global' ? view.value.globalPath : view.value.projectPath
})

const syncJsonFromPolicy = () => {
  const p = activePolicy.value
  if (!p) return
  if (scope.value === 'global') {
    jsonText.value = JSON.stringify(
      {
        agentPermissionMode: globalMode.value,
        allow: p.allow,
        ask: p.ask,
        deny: p.deny,
      },
      null,
      2,
    )
  } else {
    jsonText.value = JSON.stringify(p, null, 2)
  }
}

const reload = async () => {
  busy.value = true
  status.value = ''
  const res = await window.axecoder.permissionsGet(props.projectRoot ?? '')
  busy.value = false
  if (!res.ok) {
    status.value = res.error
    return
  }
  view.value = res.data
  globalMode.value = res.data.agentPermissionMode
  projectMode.value = res.data.project.mode
  syncJsonFromPolicy()
}

const savePolicy = async (next: PermissionsPolicy) => {
  busy.value = true
  status.value = ''
  let res
  if (scope.value === 'global') {
    res = await window.axecoder.permissionsSetGlobal({
      agentPermissionMode: globalMode.value,
      allow: next.allow,
      ask: next.ask,
      deny: next.deny,
    })
  } else {
    if (!props.projectRoot?.trim()) {
      busy.value = false
      status.value = t('settings.permissions.noProject')
      return
    }
    res = await window.axecoder.permissionsSetProject(props.projectRoot, next)
  }
  busy.value = false
  if (!res.ok) {
    status.value = res.error ?? t('settings.permissions.saveFail')
    return
  }
  status.value = t('settings.permissions.saveOk')
  await reload()
}

const addRule = async (list: 'deny' | 'ask' | 'allow') => {
  const rule = drafts.value[list].trim()
  if (!rule || !activePolicy.value) return
  const p = activePolicy.value
  if (p[list].includes(rule)) return
  await savePolicy({ ...p, [list]: [...p[list], rule] })
  drafts.value[list] = ''
}

const removeRule = async (list: 'deny' | 'ask' | 'allow', rule: string) => {
  if (!activePolicy.value) return
  const p = activePolicy.value
  await savePolicy({ ...p, [list]: p[list].filter((r) => r !== rule) })
}

const onGlobalMode = async (e: Event) => {
  globalMode.value = (e.target as HTMLSelectElement).value as typeof globalMode.value
  if (!activePolicy.value) return
  await savePolicy(activePolicy.value)
}

const onProjectMode = async (e: Event) => {
  projectMode.value = (e.target as HTMLSelectElement).value as PermissionDecision
  if (!activePolicy.value) return
  await savePolicy({ ...activePolicy.value, mode: projectMode.value })
}

const saveJson = async () => {
  busy.value = true
  status.value = ''
  let res
  if (scope.value === 'global') {
    res = await window.axecoder.permissionsWriteGlobalJson(jsonText.value)
  } else {
    if (!props.projectRoot?.trim()) {
      busy.value = false
      status.value = t('settings.permissions.noProject')
      return
    }
    res = await window.axecoder.permissionsWriteProjectJson(props.projectRoot, jsonText.value)
  }
  busy.value = false
  if (!res.ok) {
    status.value = res.error ?? t('settings.permissions.saveFail')
    return
  }
  status.value = t('settings.permissions.saveOk')
  await reload()
}

watch(scope, () => syncJsonFromPolicy())
watch(() => props.projectRoot, () => void reload())

onMounted(() => void reload())

defineExpose({ reload })
</script>

<template>
  <div class="permissions-tab">
    <header class="perm-header">
      <div class="perm-header__text">
        <h2>{{ t('settings.permissions.title') }}</h2>
        <p class="section-desc">{{ t('settings.permissions.desc') }}</p>
      </div>
      <div class="perm-toolbar">
        <div class="scope-row">
          <button
            type="button"
            class="scope-btn"
            :class="{ active: scope === 'global' }"
            :disabled="busy"
            @click="scope = 'global'"
          >
            {{ t('settings.permissions.scopeGlobal') }}
          </button>
          <button
            type="button"
            class="scope-btn"
            :class="{ active: scope === 'project' }"
            :disabled="busy"
            @click="scope = 'project'"
          >
            {{ t('settings.permissions.scopeProject') }}
          </button>
        </div>
        <label class="mode-row">
          <span class="mode-label">{{ t('settings.permissions.writerMode') }}</span>
          <select
            v-if="scope === 'global'"
            class="mode-select"
            :value="globalMode"
            :disabled="busy"
            @change="onGlobalMode"
          >
            <option value="default">{{ t('settings.permissions.modeDefault') }}</option>
            <option value="acceptEdits">{{ t('settings.permissions.modeAcceptEdits') }}</option>
            <option value="bypassPermissions">{{ t('settings.permissions.modeBypass') }}</option>
          </select>
          <select
            v-else
            class="mode-select"
            :value="projectMode"
            :disabled="busy"
            @change="onProjectMode"
          >
            <option value="ask">{{ t('settings.permissions.modeAsk') }}</option>
            <option value="allow">{{ t('settings.permissions.modeAllow') }}</option>
            <option value="deny">{{ t('settings.permissions.modeDeny') }}</option>
          </select>
        </label>
      </div>
    </header>

    <div class="perm-body">
      <section v-if="activePolicy" class="rules-panel">
        <div class="rules-stack">
          <div
            v-for="list in (['deny', 'ask', 'allow'] as const)"
            :key="list"
            class="rules-block"
            :data-list="list"
          >
            <div class="rules-label">{{ t(`settings.permissions.${list}`) }}</div>
            <div class="rules-chips">
              <span v-if="!activePolicy[list].length" class="rules-empty">{{ t('common.none') }}</span>
              <span v-for="rule in activePolicy[list]" :key="rule" class="rule-chip">
                {{ rule }}
                <button type="button" class="rule-x" :disabled="busy" @click="removeRule(list, rule)">×</button>
              </span>
            </div>
            <div class="rules-add">
              <input
                v-model="drafts[list]"
                class="rule-input"
                :placeholder="t('settings.permissions.addRule')"
                :disabled="busy"
                @keydown.enter.prevent="addRule(list)"
              />
              <button
                type="button"
                class="add-btn"
                :disabled="busy || !drafts[list].trim()"
                @click="addRule(list)"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <p class="rule-hint">{{ t('settings.permissions.ruleHint') }}</p>
      </section>

      <aside class="json-panel">
        <div class="json-panel__head">
          <h3 class="section-title">{{ t('settings.permissions.jsonTitle') }}</h3>
          <p v-if="activePath" class="json-path" :title="activePath">{{ activePath }}</p>
        </div>
        <textarea v-model="jsonText" class="json-editor" :disabled="busy" spellcheck="false" />
        <button type="button" class="save-json-btn" :disabled="busy" @click="saveJson">
          {{ t('settings.permissions.jsonSave') }}
        </button>
      </aside>
    </div>

    <p v-if="status" class="status">{{ status }}</p>
  </div>
</template>

<style scoped>
.permissions-tab {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  padding: 24px 28px 32px;
  box-sizing: border-box;
}

.perm-header {
  flex-shrink: 0;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--wc-border);
}

.perm-header h2 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 600;
  color: var(--wc-text);
}

.section-desc {
  margin: 0;
  font-size: 12px;
  color: var(--wc-text-dim);
  line-height: 1.5;
  max-width: 720px;
}

.perm-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px 24px;
  margin-top: 14px;
}

.scope-row {
  display: flex;
  gap: 6px;
  padding: 3px;
  border-radius: 8px;
  background: var(--wc-bg-dark);
  border: 1px solid var(--wc-border);
}

.scope-btn {
  padding: 5px 14px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--wc-text-muted);
  font-size: 12px;
}

.scope-btn.active {
  background: var(--wc-input-bg);
  color: var(--wc-text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.12);
}

.mode-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 280px;
}

.mode-label {
  font-size: 12px;
  color: var(--wc-text-muted);
  white-space: nowrap;
}

.mode-select {
  flex: 1;
  max-width: 360px;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--wc-border);
  background: var(--wc-input-bg);
  color: var(--wc-text);
  font-size: 12px;
}

.perm-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 38%);
  gap: 20px;
  flex: 1;
  min-height: 0;
  align-items: stretch;
}

.rules-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.rules-stack {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rules-block {
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  padding: 10px 12px;
  background: var(--wc-input-bg);
}

.rules-block[data-list='deny'] .rules-label {
  color: #e57373;
}

.rules-block[data-list='ask'] .rules-label {
  color: #ffb74d;
}

.rules-block[data-list='allow'] .rules-label {
  color: #81c784;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0;
  color: var(--wc-text);
}

.rules-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 8px;
}

.rules-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  min-height: 24px;
  margin-bottom: 8px;
}

.rules-empty {
  font-size: 12px;
  color: var(--wc-text-dim);
}

.rule-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--wc-bg-dark);
  font-size: 12px;
  font-family: var(--wc-mono, monospace);
}

.rule-x {
  color: var(--wc-text-dim);
  font-size: 14px;
  line-height: 1;
}

.rules-add {
  display: flex;
  gap: 6px;
}

.rule-input {
  flex: 1;
  min-width: 0;
  padding: 5px 8px;
  border-radius: 4px;
  border: 1px solid var(--wc-border);
  background: var(--wc-bg);
  color: var(--wc-text);
  font-size: 12px;
}

.add-btn {
  width: 30px;
  flex-shrink: 0;
  border-radius: 4px;
  border: 1px solid var(--wc-border);
  background: var(--wc-bg);
  color: var(--wc-text);
}

.rule-hint {
  margin: 12px 0 0;
  font-size: 11px;
  color: var(--wc-text-dim);
  line-height: 1.45;
}

.json-panel {
  display: flex;
  flex-direction: column;
  min-height: 360px;
  border: 1px solid var(--wc-border);
  border-radius: 10px;
  padding: 12px 14px;
  background: var(--wc-bg-dark);
}

.json-panel__head {
  flex-shrink: 0;
  margin-bottom: 10px;
}

.json-path {
  font-size: 11px;
  color: var(--wc-text-dim);
  margin: 6px 0 0;
  font-family: var(--wc-mono, monospace);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.json-editor {
  flex: 1;
  min-height: 200px;
  width: 100%;
  box-sizing: border-box;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--wc-border);
  background: var(--wc-input-bg);
  color: var(--wc-text);
  font-family: var(--wc-mono, monospace);
  font-size: 12px;
  line-height: 1.45;
  resize: none;
}

.save-json-btn {
  flex-shrink: 0;
  margin-top: 10px;
  padding: 7px 14px;
  border-radius: 6px;
  border: none;
  background: var(--wc-accent);
  color: #fff;
  font-size: 12px;
  align-self: flex-end;
}

.status {
  flex-shrink: 0;
  margin-top: 12px;
  font-size: 12px;
  color: var(--wc-text-muted);
}

@media (max-width: 860px) {
  .perm-body {
    grid-template-columns: 1fr;
  }

  .json-panel {
    min-height: 240px;
  }
}
</style>

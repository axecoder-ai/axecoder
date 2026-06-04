<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { RuleDetail, RuleScope } from '../../types/axecoder'
import { fileNameFromPath } from '../../composables/workbench-state'
import SwitchToggle from './SwitchToggle.vue'

const props = defineProps<{
  visible: boolean
  editing: RuleDetail | null
  projectRoot: string | null
  defaultScope: RuleScope
}>()

const emit = defineEmits<{
  close: []
  save: [payload: {
    scope: RuleScope
    fileName: string
    description: string
    alwaysApply: boolean
    globs: string
    body: string
    isNew: boolean
  }]
}>()

const scope = ref<RuleScope>('user')
const description = ref('')
const alwaysApply = ref(true)
const globs = ref('')
const body = ref('')

const canUseProject = computed(() => Boolean(props.projectRoot?.trim()))

const projectScopeLabel = computed(() =>
  props.projectRoot ? fileNameFromPath(props.projectRoot) : 'Project',
)

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    if (props.editing) {
      scope.value = props.editing.scope
      description.value = props.editing.description
      alwaysApply.value = props.editing.alwaysApply
      globs.value = props.editing.globs ?? ''
      body.value = props.editing.body
    } else {
      scope.value =
        props.defaultScope === 'project' && canUseProject.value ? 'project' : 'user'
      description.value = ''
      alwaysApply.value = true
      globs.value = ''
      body.value = ''
    }
  },
)

const onSave = () => {
  const desc = description.value.trim()
  if (!desc) {
    alert('Enter rule title/description')
    return
  }
  emit('save', {
    scope: scope.value,
    fileName: props.editing?.fileName ?? '',
    description: desc,
    alwaysApply: alwaysApply.value,
    globs: globs.value.trim(),
    body: body.value,
    isNew: !props.editing,
  })
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ editing ? 'Edit rule' : 'New rule' }}</h3>
      <fieldset v-if="canUseProject" class="scope-row">
        <label class="scope-opt">
          <input v-model="scope" type="radio" value="user" />
          User（~/.axecoder/rules）
        </label>
        <label class="scope-opt">
          <input v-model="scope" type="radio" value="project" />
          {{ projectScopeLabel }}（.cursor/rules）
        </label>
      </fieldset>
      <p v-else class="hint">When no project is open, rules save to ~/.axecoder/rules</p>
      <label class="row">
        Title / description
        <input v-model="description" type="text" placeholder="Short rule summary shown in the list" />
      </label>
      <label class="row row-switch">
        <span>Always apply（always inject into Agent system prompt）</span>
        <SwitchToggle v-model="alwaysApply" />
      </label>
      <label class="row">
        Globs (optional, V1 save only)
        <input v-model="globs" type="text" placeholder="e.g. src/**/*.ts" />
      </label>
      <label class="row">
        Body (Markdown)
        <textarea v-model="body" rows="12" placeholder="Rule body…" />
      </label>
      <div class="actions">
        <button type="button" @click="emit('close')">Cancel</button>
        <button type="button" class="primary" @click="onSave">Save</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 120;
}

.modal {
  background: var(--wc-panel);
  border: 1px solid var(--wc-border);
  border-radius: 10px;
  padding: 20px 24px;
  width: min(520px, 92vw);
  max-height: 90vh;
  overflow: auto;
}

.modal h3 {
  margin: 0 0 16px;
  font-size: 16px;
}

.scope-row {
  border: none;
  margin: 0 0 14px;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scope-opt {
  font-size: 12px;
  color: var(--wc-text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.hint {
  font-size: 12px;
  color: var(--wc-text-dim);
  margin: 0 0 12px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}

.row input[type='text'],
.row textarea {
  padding: 8px 10px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  color: var(--wc-text);
  font-size: 13px;
  font-family: inherit;
}

.row-switch {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.row-switch span {
  flex: 1;
  min-width: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.actions button {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 6px;
}

.actions .primary {
  background: var(--wc-accent);
  color: #fff;
}
</style>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { SubagentDetail } from '../../types/axecoder'
import { fileNameFromPath } from '../../composables/workbench-state'

type EditableScope = 'user' | 'project'

const props = defineProps<{
  visible: boolean
  editing: SubagentDetail | null
  projectRoot: string | null
  defaultScope: EditableScope
}>()

const emit = defineEmits<{
  close: []
  save: [payload: {
    scope: EditableScope
    fileName: string
    name: string
    description: string
    body: string
    readOnly: boolean
    model: string
    isBackground: boolean
    isNew: boolean
  }]
}>()

const scope = ref<EditableScope>('user')
const name = ref('')
const description = ref('')
const body = ref('')
const readOnly = ref(false)
const model = ref('inherit')
const isBackground = ref(false)

const canUseProject = computed(() => Boolean(props.projectRoot?.trim()))
const viewOnly = computed(() => props.editing?.readOnly === true && props.editing?.scope === 'builtin')

const projectScopeLabel = computed(() =>
  props.projectRoot ? fileNameFromPath(props.projectRoot) : 'Project',
)

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    if (props.editing) {
      scope.value = props.editing.scope === 'project' ? 'project' : 'user'
      name.value = props.editing.name
      description.value = props.editing.description
      body.value = props.editing.body
      readOnly.value = props.editing.readOnly
      model.value = props.editing.model || 'inherit'
      isBackground.value = props.editing.isBackground
    } else {
      scope.value =
        props.defaultScope === 'project' && canUseProject.value ? 'project' : 'user'
      name.value = ''
      description.value = ''
      body.value = ''
      readOnly.value = false
      model.value = 'inherit'
      isBackground.value = false
    }
  },
)

const onSave = () => {
  if (viewOnly.value) {
    emit('close')
    return
  }
  const n = name.value.trim()
  const desc = description.value.trim()
  if (!n) {
    alert('Enter subagent name')
    return
  }
  if (!desc) {
    alert('Enter subagent description')
    return
  }
  emit('save', {
    scope: scope.value,
    fileName: props.editing?.fileName ?? '',
    name: n,
    description: desc,
    body: body.value,
    readOnly: readOnly.value,
    model: model.value.trim() || 'inherit',
    isBackground: isBackground.value,
    isNew: !props.editing,
  })
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ viewOnly ? 'View subagent' : editing ? 'Edit subagent' : 'New subagent' }}</h3>
      <fieldset v-if="canUseProject && !viewOnly" class="scope-row">
        <label class="scope-opt">
          <input v-model="scope" type="radio" value="user" />
          User（~/.cursor/agents）
        </label>
        <label class="scope-opt">
          <input v-model="scope" type="radio" value="project" />
          {{ projectScopeLabel }}（.cursor/agents）
        </label>
      </fieldset>
      <p v-else-if="!viewOnly" class="hint">When no project is open, subagents save to ~/.cursor/agents</p>
      <p v-if="viewOnly" class="hint">Built-in subagent types are read-only.</p>
      <label class="row">
        Name（Task subagent_type）
        <input v-model="name" type="text" :readonly="viewOnly" placeholder="e.g. research-codebase" />
      </label>
      <label class="row">
        Description
        <input
          v-model="description"
          type="text"
          :readonly="viewOnly"
          placeholder="When should the agent delegate to this subagent?"
        />
      </label>
      <label v-if="!viewOnly" class="row inline">
        <input v-model="readOnly" type="checkbox" />
        Read-only tools
      </label>
      <label v-if="!viewOnly" class="row inline">
        <input v-model="isBackground" type="checkbox" />
        Prefer background (is_background)
      </label>
      <label v-if="!viewOnly" class="row">
        Model id（inherit = parent session）
        <input v-model="model" type="text" placeholder="inherit" />
      </label>
      <label class="row">
        Body (Markdown instructions)
        <textarea v-model="body" rows="12" :readonly="viewOnly" placeholder="Subagent system instructions…" />
      </label>
      <div class="actions">
        <button type="button" @click="emit('close')">{{ viewOnly ? 'Close' : 'Cancel' }}</button>
        <button v-if="!viewOnly" type="button" class="primary" @click="onSave">Save</button>
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

.row.inline {
  flex-direction: row;
  align-items: center;
  gap: 8px;
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

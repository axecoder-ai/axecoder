<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { SkillDetail } from '../../types/axecoder'
import { fileNameFromPath } from '../../composables/workbench-state'

type EditableScope = 'user' | 'project'

const props = defineProps<{
  visible: boolean
  editing: SkillDetail | null
  projectRoot: string | null
  defaultScope: EditableScope
}>()

const emit = defineEmits<{
  close: []
  save: [payload: {
    scope: EditableScope
    folderName: string
    name: string
    description: string
    body: string
    isNew: boolean
  }]
}>()

const scope = ref<EditableScope>('user')
const name = ref('')
const description = ref('')
const body = ref('')

const canUseProject = computed(() => Boolean(props.projectRoot?.trim()))
const readOnly = computed(() => props.editing?.readOnly === true)

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
    } else {
      scope.value =
        props.defaultScope === 'project' && canUseProject.value ? 'project' : 'user'
      name.value = ''
      description.value = ''
      body.value = ''
    }
  },
)

const onSave = () => {
  if (readOnly.value) {
    emit('close')
    return
  }
  const n = name.value.trim()
  const desc = description.value.trim()
  if (!n) {
    alert('Enter skill name')
    return
  }
  if (!desc) {
    alert('Enter skill description')
    return
  }
  emit('save', {
    scope: scope.value,
    folderName: props.editing?.folderName ?? '',
    name: n,
    description: desc,
    body: body.value,
    isNew: !props.editing,
  })
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ readOnly ? 'View skill' : editing ? 'Edit skill' : 'New skill' }}</h3>
      <fieldset v-if="canUseProject && !readOnly" class="scope-row">
        <label class="scope-opt">
          <input v-model="scope" type="radio" value="user" />
          User（~/.cursor/skills）
        </label>
        <label class="scope-opt">
          <input v-model="scope" type="radio" value="project" />
          {{ projectScopeLabel }}（.cursor/skills）
        </label>
      </fieldset>
      <p v-else-if="!readOnly" class="hint">When no project is open, skills save to ~/.cursor/skills</p>
      <p v-if="readOnly" class="hint">Built-in skills are read-only.</p>
      <label class="row">
        Name（slug, used by /slash command）
        <input v-model="name" type="text" :readonly="readOnly" placeholder="e.g. brainstorming" />
      </label>
      <label class="row">
        Description
        <input
          v-model="description"
          type="text"
          :readonly="readOnly"
          placeholder="When should the agent use this skill?"
        />
      </label>
      <label class="row">
        Body (Markdown)
        <textarea v-model="body" rows="12" :readonly="readOnly" placeholder="Skill instructions…" />
      </label>
      <div class="actions">
        <button type="button" @click="emit('close')">{{ readOnly ? 'Close' : 'Cancel' }}</button>
        <button v-if="!readOnly" type="button" class="primary" @click="onSave">Save</button>
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

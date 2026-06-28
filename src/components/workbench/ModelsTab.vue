<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ModelEntry, ModelSaveInput } from '../../types/axecoder'
import { appConfirm } from '../../utils/appConfirm'
import ModelFormDialog from './ModelFormDialog.vue'
import SwitchToggle from './SwitchToggle.vue'

const emit = defineEmits<{
  changed: []
}>()

const models = ref<ModelEntry[]>([])
const activeModelId = ref('')
const search = ref('')
const formVisible = ref(false)
const editing = ref<ModelEntry | null>(null)
const pingingId = ref('')
const pingMessage = ref<{ id: string; ok: boolean; text: string } | null>(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return models.value
  return models.value.filter(
    (m) =>
      m.name.toLowerCase().includes(q) ||
      m.modelId.toLowerCase().includes(q) ||
      m.provider.includes(q),
  )
})

const reload = async () => {
  const data = await window.axecoder.listModels()
  models.value = data.models
  activeModelId.value = data.activeModelId
}

onMounted(() => {
  void reload()
})

const openAdd = () => {
  editing.value = null
  formVisible.value = true
}

const openEdit = (m: ModelEntry) => {
  editing.value = m
  formVisible.value = true
}

const onSaved = async (payload: { entry: ModelEntry; apiKey: string }) => {
  const input: ModelSaveInput = { ...payload.entry }
  if (payload.apiKey.trim()) input.apiKey = payload.apiKey.trim()
  const res = await window.axecoder.saveModel(input)
  if (!res.ok) {
    alert(res.error)
    return
  }
  await reload()
  emit('changed')
}

const onToggle = async (m: ModelEntry, enabled: boolean) => {
  const prev = models.value
  models.value = models.value.map((x) => (x.id === m.id ? { ...x, enabled } : x))
  const res = await window.axecoder.toggleModel(m.id, enabled)
  if (!res.ok) {
    models.value = prev
    alert(res.error)
    return
  }
  models.value = res.data.models
  activeModelId.value = res.data.activeModelId
  emit('changed')
}

const onDelete = async (m: ModelEntry) => {
  if (!(await appConfirm(`Delete model "${m.name}"?`))) return
  const res = await window.axecoder.deleteModel(m.id)
  if (!res.ok) {
    alert(res.error)
    return
  }
  await reload()
  emit('changed')
}

const onPing = async (m: ModelEntry) => {
  pingingId.value = m.id
  pingMessage.value = null
  try {
    const res = await window.axecoder.pingModel(m.id)
    if (res.ok) {
      pingMessage.value = { id: m.id, ok: true, text: `Connected: ${res.preview}` }
    } else {
      pingMessage.value = { id: m.id, ok: false, text: res.error }
    }
  } finally {
    pingingId.value = ''
  }
}

defineExpose({ reload })
</script>

<template>
  <div class="models-tab">
    <h2>Models</h2>
    <p class="tab-desc">
      Configure API endpoints and enablement. Each model can have fast and deep API model IDs; routing picks by task complexity; subagents default to the fast ID.
    </p>
    <div class="toolbar">
      <input v-model="search" type="search" class="search" placeholder="Search models…" />
      <button type="button" class="add-btn" @click="openAdd">Add model</button>
    </div>
    <ul v-if="filtered.length" class="model-list">
      <li v-for="m in filtered" :key="m.id" class="model-row">
        <div class="model-info">
          <span class="model-name">
            {{ m.name }}
            <span v-if="m.id === activeModelId" class="active-badge">Active</span>
            <span v-if="!m.enabled" class="disabled-badge">Disabled</span>
          </span>
          <span class="model-meta">
            {{ m.provider }} · fast {{ m.fastApiModelId || m.modelId }} / deep {{ m.modelId }}
          </span>
          <span
            v-if="pingMessage?.id === m.id"
            class="ping-result"
            :class="pingMessage.ok ? 'ping-ok' : 'ping-fail'"
          >
            {{ pingMessage.text }}
          </span>
        </div>
        <div class="model-actions">
          <button
            type="button"
            class="link"
            :disabled="pingingId === m.id"
            @click="onPing(m)"
          >
            {{ pingingId === m.id ? 'Testing…' : 'Test connection' }}
          </button>
          <button type="button" class="link" @click="openEdit(m)">Edit</button>
          <button type="button" class="link danger" @click="onDelete(m)">Delete</button>
          <SwitchToggle
            :model-value="m.enabled"
            @update:model-value="(v: boolean) => onToggle(m, v)"
          />
        </div>
      </li>
    </ul>
    <p v-else class="empty">No models yet. Click Add model to configure an API.</p>
    <ModelFormDialog :visible="formVisible" :editing="editing" @close="formVisible = false" @save="onSaved" />
  </div>
</template>

<style scoped>
.models-tab {
  box-sizing: border-box;
  width: 100%;
  padding: 24px 32px;
}

h2 {
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}

.tab-desc {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--wc-text-dim);
}

.tier-picks {
  margin-bottom: 20px;
}

.tier-label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: var(--wc-text);
}

.tier-select {
  max-width: 420px;
  padding: 8px 10px;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--wc-border);
  background: var(--wc-bg);
  color: var(--wc-text);
}

.active-badge {
  margin-left: 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--wc-accent);
}

.disabled-badge {
  margin-left: 8px;
  font-size: 11px;
  color: var(--wc-text-dim);
}

.ping-result {
  display: block;
  margin-top: 6px;
  font-size: 12px;
}

.ping-ok {
  color: #3fb950;
}

.ping-fail {
  color: #f48771;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.search {
  flex: 1;
  padding: 8px 12px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  font-size: 13px;
  color: var(--wc-text);
}

.add-btn {
  padding: 8px 16px;
  font-size: 13px;
  border-radius: 6px;
  background: var(--wc-accent);
  color: #fff;
  flex-shrink: 0;
}

.model-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.model-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid var(--wc-border);
  gap: 16px;
}

.model-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
}

.model-meta {
  font-size: 12px;
  color: var(--wc-text-dim);
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.link {
  font-size: 12px;
  color: var(--wc-text-muted);
  background: none;
  padding: 0;
}

.link:hover {
  color: var(--wc-text);
}

.link.danger:hover {
  color: #f48771;
}

.empty {
  color: var(--wc-text-dim);
  font-size: 13px;
  margin-top: 24px;
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ModelEntry, ModelSaveInput } from '../../types/writcraft'
import ModelFormDialog from './ModelFormDialog.vue'

const emit = defineEmits<{
  changed: []
}>()

const models = ref<ModelEntry[]>([])
const activeModelId = ref('')
const search = ref('')
const formVisible = ref(false)
const editing = ref<ModelEntry | null>(null)

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
  const data = await window.writcraft.listModels()
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
  const res = await window.writcraft.saveModel(input)
  if (!res.ok) {
    alert(res.error)
    return
  }
  await reload()
  emit('changed')
}

const onToggle = async (m: ModelEntry) => {
  const res = await window.writcraft.toggleModel(m.id, !m.enabled)
  if (!res.ok) {
    alert(res.error)
    return
  }
  await reload()
  emit('changed')
}

const onDelete = async (m: ModelEntry) => {
  if (!confirm(`删除模型「${m.name}」？`)) return
  const res = await window.writcraft.deleteModel(m.id)
  if (!res.ok) {
    alert(res.error)
    return
  }
  await reload()
  emit('changed')
}

defineExpose({ reload })
</script>

<template>
  <div class="models-tab">
    <h2>Models</h2>
    <div class="toolbar">
      <input v-model="search" type="search" class="search" placeholder="搜索模型…" />
      <button type="button" class="add-btn" @click="openAdd">添加模型</button>
    </div>
    <ul v-if="filtered.length" class="model-list">
      <li v-for="m in filtered" :key="m.id" class="model-row">
        <div class="model-info">
          <span class="model-name">{{ m.name }}</span>
          <span class="model-meta">{{ m.provider }} · {{ m.modelId }}</span>
        </div>
        <div class="model-actions">
          <button type="button" class="link" @click="openEdit(m)">编辑</button>
          <button type="button" class="link danger" @click="onDelete(m)">删除</button>
          <label class="switch">
            <input type="checkbox" :checked="m.enabled" @change="onToggle(m)" />
            <span class="slider" />
          </label>
        </div>
      </li>
    </ul>
    <p v-else class="empty">暂无模型，点击「添加模型」配置 API</p>
    <ModelFormDialog :visible="formVisible" :editing="editing" @close="formVisible = false" @save="onSaved" />
  </div>
</template>

<style scoped>
.models-tab {
  padding: 24px 32px;
  max-width: 720px;
}

h2 {
  margin: 0 0 20px;
  font-size: 22px;
  font-weight: 600;
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

.switch {
  position: relative;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  inset: 0;
  background: var(--wc-border);
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s;
}

.slider::before {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  left: 2px;
  top: 2px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.2s;
}

.switch input:checked + .slider {
  background: #3fb950;
}

.switch input:checked + .slider::before {
  transform: translateX(16px);
}

.empty {
  color: var(--wc-text-dim);
  font-size: 13px;
  margin-top: 24px;
}
</style>

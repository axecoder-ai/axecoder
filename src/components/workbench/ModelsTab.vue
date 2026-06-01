<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { ModelEntry, ModelSaveInput } from '../../types/axecoder'
import ModelFormDialog from './ModelFormDialog.vue'

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

const onToggle = async (m: ModelEntry) => {
  const res = await window.axecoder.toggleModel(m.id, !m.enabled)
  if (!res.ok) {
    alert(res.error)
    return
  }
  await reload()
  emit('changed')
}

const onDelete = async (m: ModelEntry) => {
  if (!confirm(`删除模型「${m.name}」？`)) return
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
      pingMessage.value = { id: m.id, ok: true, text: `连接成功：${res.preview}` }
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
    <h2>模型</h2>
    <p class="tab-desc">配置 API 与启用状态；「当前」为聊天与协作工坊默认使用的模型。</p>
    <div class="toolbar">
      <input v-model="search" type="search" class="search" placeholder="搜索模型…" />
      <button type="button" class="add-btn" @click="openAdd">添加模型</button>
    </div>
    <ul v-if="filtered.length" class="model-list">
      <li v-for="m in filtered" :key="m.id" class="model-row">
        <div class="model-info">
          <span class="model-name">
            {{ m.name }}
            <span v-if="m.id === activeModelId" class="active-badge">当前</span>
            <span v-if="!m.enabled" class="disabled-badge">已禁用</span>
          </span>
          <span class="model-meta">{{ m.provider }} · {{ m.modelId }}</span>
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
            {{ pingingId === m.id ? '测试中…' : '测试连接' }}
          </button>
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
  margin: 0 0 8px;
  font-size: 22px;
  font-weight: 600;
}

.tab-desc {
  margin: 0 0 20px;
  font-size: 13px;
  color: var(--wc-text-dim);
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

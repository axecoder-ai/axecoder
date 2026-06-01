<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { ModelEntry, ModelProvider } from '../../types/axecoder'

const props = defineProps<{
  visible: boolean
  editing: ModelEntry | null
}>()

const emit = defineEmits<{
  close: []
  save: [payload: { entry: ModelEntry; apiKey: string }]
}>()

const name = ref('')
const provider = ref<ModelProvider>('openai')
const modelId = ref('')
const baseUrl = ref('https://api.openai.com/v1')
const apiKey = ref('')
const enabled = ref(true)

const defaultUrl = (p: ModelProvider) => {
  if (p === 'openai') return 'https://api.openai.com/v1'
  if (p === 'ollama') return 'http://127.0.0.1:11434'
  return 'https://api.anthropic.com'
}

const needsKey = computed(() => provider.value === 'openai' || provider.value === 'anthropic')

watch(
  () => props.visible,
  (v) => {
    if (!v) return
    if (props.editing) {
      name.value = props.editing.name
      provider.value = props.editing.provider
      modelId.value = props.editing.modelId
      baseUrl.value = props.editing.baseUrl
      enabled.value = props.editing.enabled
      apiKey.value = ''
    } else {
      name.value = ''
      provider.value = 'openai'
      modelId.value = ''
      baseUrl.value = defaultUrl('openai')
      apiKey.value = ''
      enabled.value = true
    }
  },
)

watch(provider, (p) => {
  if (!props.editing) baseUrl.value = defaultUrl(p)
})

const onSave = () => {
  const id = props.editing?.id ?? `model-${Date.now()}`
  emit('save', {
    entry: {
      id,
      name: name.value.trim() || modelId.value.trim(),
      provider: provider.value,
      modelId: modelId.value.trim(),
      baseUrl: baseUrl.value.trim(),
      enabled: enabled.value,
    },
    apiKey: apiKey.value,
  })
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>{{ editing ? '编辑模型' : '添加模型' }}</h3>
      <label class="row">
        显示名称
        <input v-model="name" type="text" placeholder="DeepSeek" />
      </label>
      <label class="row">
        协议格式
        <select v-model="provider">
          <option value="openai">OpenAI</option>
          <option value="ollama">Ollama</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </label>
      <label class="row">
        Base URL
        <input v-model="baseUrl" type="text" />
      </label>
      <label class="row">
        模型 ID
        <input v-model="modelId" type="text" placeholder="deepseek-chat" />
      </label>
      <label v-if="needsKey" class="row">
        API Key
        <input v-model="apiKey" type="password" :placeholder="editing ? '留空则不修改' : 'sk-...'" autocomplete="off" />
      </label>
      <label v-else class="row">
        API Key（可选）
        <input v-model="apiKey" type="password" placeholder="可选" autocomplete="off" />
      </label>
      <label class="row check">
        <input v-model="enabled" type="checkbox" />
        启用
      </label>
      <div class="actions">
        <button type="button" @click="emit('close')">取消</button>
        <button type="button" class="primary" :disabled="!modelId.trim() || !baseUrl.trim()" @click="onSave">
          保存
        </button>
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
  z-index: 110;
}

.modal {
  background: var(--wc-panel);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  padding: 20px;
  min-width: 380px;
  max-width: 480px;
}

.modal h3 {
  margin: 0 0 16px;
  font-size: 14px;
}

.row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}

.row.check {
  flex-direction: row;
  align-items: center;
  gap: 8px;
}

.row input,
.row select {
  padding: 6px 8px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  color: var(--wc-text);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}

.actions button {
  padding: 6px 14px;
  font-size: 12px;
  border-radius: 4px;
}

.actions .primary {
  background: var(--wc-active);
  color: var(--wc-text);
}

.actions .primary:disabled {
  opacity: 0.5;
}
</style>

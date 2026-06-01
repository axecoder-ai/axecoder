<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AppSettings } from '../../types/axecoder'

const props = defineProps<{
  visible: boolean
  settings: AppSettings
}>()

const emit = defineEmits<{
  close: []
  save: [partial: Partial<AppSettings>]
}>()

const local = ref<AppSettings>({ ...props.settings })

watch(
  () => props.visible,
  (v) => {
    if (v) local.value = { ...props.settings }
  },
)

const onSave = () => {
  emit('save', { ...local.value })
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
    <div class="modal">
      <h3>设置</h3>
      <label class="row">
        <input v-model="local.autoSave" type="checkbox" />
        自动保存
      </label>
      <label class="row">
        自动保存延迟（毫秒）
        <input v-model.number="local.autoSaveDelay" type="number" min="200" step="100" />
      </label>
      <label class="row">
        编辑器字号
        <input v-model.number="local.fontSize" type="number" min="10" max="24" />
      </label>
      <div class="actions">
        <button type="button" @click="emit('close')">取消</button>
        <button type="button" class="primary" @click="onSave">保存</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.modal {
  background: var(--wc-panel);
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  padding: 20px;
  min-width: 320px;
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

.row input[type='number'] {
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
</style>

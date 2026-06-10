<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from '../../i18n'
import type { McpPluginView } from '../../types/axecoder'
import SwitchToggle from './SwitchToggle.vue'

const props = defineProps<{
  projectRoot?: string
}>()

const emit = defineEmits<{
  changed: []
}>()

const { t } = useI18n()

const plugins = ref<McpPluginView[]>([])
const status = ref('')
const busyId = ref('')
const testingId = ref('')

const reload = async () => {
  const res = await window.axecoder.listMcpPlugins(props.projectRoot)
  if (!res.ok) {
    status.value = res.error
    return
  }
  plugins.value = res.plugins
}

onMounted(() => {
  void reload()
})

const onToggle = async (p: McpPluginView, enabled: boolean) => {
  if (p.managedBy === 'mcp.json') return
  const prev = plugins.value
  plugins.value = plugins.value.map((x) => (x.id === p.id ? { ...x, enabled } : x))
  const res = await window.axecoder.setMcpPluginEnabled(p.id, enabled, props.projectRoot)
  if (!res.ok) {
    plugins.value = prev
    status.value = res.error
    return
  }
  status.value = ''
  await reload()
  emit('changed')
}

const onConnect = async (p: McpPluginView) => {
  busyId.value = p.id
  status.value = ''
  const res = await window.axecoder.connectMcpPlugin(p.id, props.projectRoot)
  busyId.value = ''
  if (!res.ok) {
    status.value = t('settings.mcp.connectFail', { error: res.error })
    return
  }
  status.value = t('settings.mcp.connectOk')
  await reload()
  emit('changed')
}

const onDisconnect = async (p: McpPluginView) => {
  busyId.value = p.id
  status.value = ''
  const res = await window.axecoder.disconnectMcpPlugin(p.id)
  busyId.value = ''
  if (!res.ok) {
    status.value = res.error
    return
  }
  status.value = t('settings.mcp.disconnected')
  await reload()
  emit('changed')
}

const onTest = async (p: McpPluginView) => {
  testingId.value = p.id
  status.value = ''
  const res = await window.axecoder.testMcpPlugin(p.id)
  testingId.value = ''
  if (res.ok) {
    status.value = t('settings.mcp.testOk', { tools: res.tools.join(', ') })
  } else {
    status.value = t('settings.mcp.testFail', { error: res.error })
  }
}

defineExpose({ reload })
</script>

<template>
  <div class="mcp-plugins-tab">
    <h2>{{ t('settings.mcp.title') }}</h2>
    <p class="tab-desc">{{ t('settings.mcp.desc') }}</p>
    <p v-if="status" class="status" :class="{ ok: status.includes('成功') || status.includes('Connected') }">
      {{ status }}
    </p>
    <ul class="plugin-list">
      <li v-for="p in plugins" :key="p.id" class="plugin-card">
        <div class="plugin-head">
          <div class="plugin-info">
            <span class="plugin-name">{{ p.displayName }}</span>
            <span v-if="p.connected" class="badge connected">{{ t('settings.mcp.connected') }}</span>
            <p class="plugin-desc">{{ p.description }}</p>
            <a class="plugin-link" :href="p.docUrl" target="_blank" rel="noopener noreferrer">
              {{ p.docUrl }}
            </a>
            <p v-if="p.managedBy === 'mcp.json'" class="hint">
              {{ t('settings.mcp.managedByMcpJson') }}
            </p>
            <p v-else-if="!p.connected" class="hint">{{ t('settings.mcp.needsConnect') }}</p>
            <p v-else class="hint">{{ t('settings.mcp.oauthHint') }}</p>
          </div>
          <SwitchToggle
            :model-value="p.enabled"
            :disabled="p.managedBy === 'mcp.json' || !p.connected"
            @update:model-value="(v: boolean) => onToggle(p, v)"
          />
        </div>
        <div v-if="p.managedBy === 'plugin'" class="plugin-actions">
          <div class="btn-row">
            <button
              v-if="!p.connected"
              type="button"
              class="btn primary"
              :disabled="busyId === p.id"
              @click="onConnect(p)"
            >
              {{ busyId === p.id ? t('settings.mcp.connecting') : t('settings.mcp.connect') }}
            </button>
            <button
              v-else
              type="button"
              class="btn"
              :disabled="busyId === p.id"
              @click="onDisconnect(p)"
            >
              {{ t('settings.mcp.disconnect') }}
            </button>
            <button
              type="button"
              class="btn"
              :disabled="!p.connected || testingId === p.id"
              @click="onTest(p)"
            >
              {{ testingId === p.id ? t('settings.mcp.testing') : t('settings.mcp.testConnection') }}
            </button>
          </div>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.mcp-plugins-tab {
  max-width: 720px;
  padding: 24px 32px;
}

h2 {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
}

.tab-desc {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--wc-text-muted);
}

.status {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--wc-error, #e06c75);
}

.status.ok {
  color: var(--wc-success, #98c379);
}

.plugin-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.plugin-card {
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  padding: 16px;
  background: var(--wc-bg-dark);
}

.plugin-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.plugin-name {
  font-size: 14px;
  font-weight: 600;
  margin-right: 8px;
}

.badge.connected {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(152, 195, 121, 0.2);
  color: var(--wc-success, #98c379);
}

.plugin-desc {
  margin: 6px 0 4px;
  font-size: 13px;
  color: var(--wc-text-muted);
}

.plugin-link {
  font-size: 12px;
  color: var(--wc-accent, #61afef);
  word-break: break-all;
}

.hint {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--wc-text-muted);
}

.plugin-actions {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--wc-border);
}

.btn-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--wc-border);
  background: var(--wc-panel);
  color: var(--wc-text);
}

.btn.primary {
  background: var(--wc-accent, #61afef);
  border-color: transparent;
  color: #fff;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

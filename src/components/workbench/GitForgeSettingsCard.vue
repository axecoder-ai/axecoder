<script setup lang="ts">
import { ref, watch } from 'vue'
import type { AppSettings } from '../../types/axecoder'

const props = defineProps<{
  settings: AppSettings
  projectRoot?: string
}>()

const emit = defineEmits<{
  save: [partial: Partial<AppSettings>]
}>()

const provider = ref<'auto' | 'github' | 'gitee' | 'custom'>('auto')
const apiBase = ref('')
const webBase = ref('')
const token = ref('')
const statusLine = ref('')

const refreshStatus = async () => {
  const root = props.projectRoot?.trim()
  if (!root) {
    statusLine.value = 'Open a project to detect git remote.'
    return
  }
  const res = await window.axecoder.gitForgeStatus(root)
  if (!res.ok) {
    statusLine.value = res.error
    return
  }
  const parts = [
    `Detected: ${res.kind}`,
    res.repoSlug ? `repo ${res.repoSlug}` : '',
    res.kind === 'github' ? `gh ${res.ghAuth}` : '',
    res.remoteUrl ? `remote ${res.remoteUrl}` : '',
  ].filter(Boolean)
  statusLine.value = parts.join(' · ')
}

watch(
  () => [props.settings, props.projectRoot] as const,
  ([s]) => {
    provider.value = s.gitForgeProvider ?? 'auto'
    apiBase.value = s.gitForgeApiBase ?? ''
    webBase.value = s.gitForgeWebBase ?? ''
    token.value = s.gitForgeAccessToken ?? ''
    void refreshStatus()
  },
  { immediate: true, deep: true },
)

const saveProvider = () => {
  if (provider.value === (props.settings.gitForgeProvider ?? 'auto')) return
  emit('save', { gitForgeProvider: provider.value })
}

const saveApiBase = () => {
  const next = apiBase.value.trim()
  if (next === (props.settings.gitForgeApiBase ?? '')) return
  emit('save', { gitForgeApiBase: next })
}

const saveWebBase = () => {
  const next = webBase.value.trim()
  if (next === (props.settings.gitForgeWebBase ?? '')) return
  emit('save', { gitForgeWebBase: next })
}

const saveToken = () => {
  const next = token.value.trim()
  if (next === (props.settings.gitForgeAccessToken ?? '')) return
  emit('save', { gitForgeAccessToken: next })
}
</script>

<template>
  <section class="forge-card">
    <h3 class="forge-title">Git hosting</h3>
    <p class="forge-hint">GitHub uses <code>gh</code> CLI; Gitee uses API + token. Custom host for enterprise GitHub / Forgejo.</p>
    <p class="forge-status">{{ statusLine }}</p>

    <label class="forge-row">
      <span>Provider</span>
      <select v-model="provider" @change="saveProvider">
        <option value="auto">Auto (from remote)</option>
        <option value="github">GitHub</option>
        <option value="gitee">Gitee</option>
        <option value="custom">Custom</option>
      </select>
    </label>

    <label class="forge-row">
      <span>Web base URL</span>
      <input
        v-model="webBase"
        type="url"
        placeholder="https://gitee.com or https://git.company.com"
        @blur="saveWebBase"
      />
    </label>

    <label class="forge-row">
      <span>API base URL</span>
      <input
        v-model="apiBase"
        type="url"
        placeholder="https://gitee.com/api/v5"
        @blur="saveApiBase"
      />
    </label>

    <label class="forge-row">
      <span>Access token</span>
      <input
        v-model="token"
        type="password"
        autocomplete="off"
        placeholder="GitHub PAT or Gitee token"
        @blur="saveToken"
      />
    </label>
  </section>
</template>

<style scoped>
.forge-card {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.25));
}
.forge-title {
  margin: 0 0 6px;
  font-size: 13px;
  font-weight: 600;
}
.forge-hint,
.forge-status {
  margin: 0 0 8px;
  font-size: 12px;
  opacity: 0.85;
  line-height: 1.4;
}
.forge-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 10px;
  font-size: 12px;
}
.forge-row input,
.forge-row select {
  padding: 6px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-subtle, rgba(128, 128, 128, 0.35));
  background: var(--input-bg, transparent);
  color: inherit;
}
</style>

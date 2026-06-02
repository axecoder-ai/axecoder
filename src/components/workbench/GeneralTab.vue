<script setup lang="ts">
import type { AgentOutputStyleId, AppSettings, AppTheme } from '../../types/axecoder'
import SwitchToggle from './SwitchToggle.vue'

const props = defineProps<{
  settings: AppSettings
}>()

const emit = defineEmits<{
  save: [partial: Partial<AppSettings>]
}>()

const themes: { id: AppTheme; label: string; desc: string }[] = [
  { id: 'vscode', label: 'VS Code Dark', desc: 'Classic editor dark theme' },
  { id: 'aura-light', label: 'Aura Light', desc: 'Soft light gray background' },
  { id: 'aura-dark', label: 'Aura Dark', desc: 'Low-contrast dark interface' },
]

const pickTheme = (id: AppTheme) => {
  if (id === props.settings.theme) return
  emit('save', { theme: id })
}

const onAutoSave = (v: boolean) => {
  emit('save', { autoSave: v })
}

const onDelay = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (n >= 200) emit('save', { autoSaveDelay: n })
}

const onFontSize = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (n >= 10 && n <= 24) emit('save', { fontSize: n })
}

const onAgentAutoApply = (v: boolean) => {
  emit('save', { agentAutoApplyWrites: v })
}

const outputStyles: { id: AgentOutputStyleId; label: string; desc: string }[] = [
  { id: 'default', label: 'Default', desc: 'Standard software engineering assistant' },
  { id: 'Explanatory', label: 'Explanatory', desc: 'Adds codebase insights when finishing tasks' },
  { id: 'Learning', label: 'Learning', desc: 'Collaborative hands-on practice with insights' },
]

const onOutputStyle = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value as AgentOutputStyleId
  if (v === props.settings.agentOutputStyle) return
  emit('save', { agentOutputStyle: v })
}

const onCompletionSoundEnabled = (v: boolean) => {
  emit('save', { agentCompletionSoundEnabled: v })
}

const soundLabel = () =>
  props.settings.agentCompletionSoundDisplayName?.trim() ||
  props.settings.agentCompletionSoundPath?.trim() ||
  ''

const browseCompletionSound = async () => {
  const res = await window.axecoder.pickCompletionSound()
  if (!res.ok) return
  if (res.cancelled) return
  const { clearCompletionSoundCache } = await import('../../utils/play-completion-sound')
  clearCompletionSoundCache()
  emit('save', {
    agentCompletionSoundPath: res.path,
    agentCompletionSoundDisplayName: res.displayName,
    agentCompletionSoundEnabled: true,
  })
}

const previewCompletionSound = async () => {
  const { playAgentCompletionSound } = await import('../../utils/play-completion-sound')
  await playAgentCompletionSound({
    enabled: true,
    path: props.settings.agentCompletionSoundPath,
  })
}

const clearCompletionSound = () => {
  void import('../../utils/play-completion-sound').then(({ clearCompletionSoundCache }) => {
    clearCompletionSoundCache()
  })
  emit('save', {
    agentCompletionSoundPath: '',
    agentCompletionSoundDisplayName: '',
  })
}
</script>

<template>
  <div class="general-tab">
    <h2>General</h2>

    <section class="section">
      <h3 class="section-title">Color theme</h3>
      <p class="section-desc">Choose the interface theme; applies immediately</p>
      <div class="theme-grid">
        <button
          v-for="t in themes"
          :key="t.id"
          type="button"
          class="theme-card"
          :class="{ active: settings.theme === t.id }"
          @click="pickTheme(t.id)"
        >
          <span class="theme-preview" :data-theme-preview="t.id" />
          <span class="theme-label">{{ t.label }}</span>
          <span class="theme-desc">{{ t.desc }}</span>
        </button>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Agent</h3>
      <p class="section-desc">How Agent confirms changes to project files during a chat</p>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">Auto-apply disk writes</span>
          <p class="pref-hint">When enabled, Write / Edit / Delete / Move apply directly without Apply / Reject prompts</p>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="!!settings.agentAutoApplyWrites"
            @update:model-value="onAgentAutoApply"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">Output style</span>
          <p class="pref-hint">Affects system prompts for new Agent sessions. Custom styles: ~/.axecoder/output-styles, ~/.claude/output-styles, or project .axecoder/output-styles (*.md). Use /style in chat to switch.</p>
        </div>
        <div class="pref-control pref-control--wide">
          <select
            class="output-style-select"
            :value="settings.agentOutputStyle"
            @change="onOutputStyle"
          >
            <option v-for="s in outputStyles" :key="s.id" :value="s.id">
              {{ s.label }} — {{ s.desc }}
            </option>
          </select>
        </div>
      </div>
      <div class="pref-item pref-item--stack">
        <div class="pref-info">
          <span class="pref-label">Completion sound</span>
          <p class="pref-hint">Play the selected audio when Agent finishes responding successfully</p>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="!!settings.agentCompletionSoundEnabled"
            @update:model-value="onCompletionSoundEnabled"
          />
        </div>
        <div v-if="settings.agentCompletionSoundEnabled" class="sound-row">
          <button type="button" class="sound-btn" @click="browseCompletionSound">Browse…</button>
          <button
            type="button"
            class="sound-btn"
            :disabled="!settings.agentCompletionSoundPath"
            @click="previewCompletionSound"
          >
            Preview
          </button>
          <span v-if="soundLabel()" class="sound-file">
            {{ soundLabel() }}
            <button type="button" class="sound-clear" title="Clear" @click="clearCompletionSound">×</button>
          </span>
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Editor</h3>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">Auto-save</span>
        </div>
        <div class="pref-control">
          <SwitchToggle :model-value="!!settings.autoSave" @update:model-value="onAutoSave" />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">Auto-save delay (ms)</span>
        </div>
        <div class="pref-control">
          <input
            type="number"
            class="pref-input"
            min="200"
            step="100"
            :value="settings.autoSaveDelay"
            @change="onDelay"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">Editor font size</span>
        </div>
        <div class="pref-control">
          <input
            type="number"
            class="pref-input narrow"
            min="10"
            max="24"
            :value="settings.fontSize"
            @change="onFontSize"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.general-tab {
  box-sizing: border-box;
  width: 100%;
  padding: 24px 32px;
}

h2 {
  margin: 0 0 28px;
  font-size: 22px;
  font-weight: 600;
}

.section {
  margin-bottom: 32px;
}

.section-title {
  margin: 0 0 4px;
  font-size: 14px;
  font-weight: 600;
}

.section-desc {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--wc-text-dim);
}

.pref-item {
  display: flex;
  align-items: flex-start;
  gap: 20px;
  padding: 12px 0;
  border-bottom: 1px solid var(--wc-border);
}

.pref-info {
  flex: 1;
  min-width: 0;
}

.pref-label {
  display: block;
  font-size: 13px;
  color: var(--wc-text);
}

.pref-hint {
  margin: 4px 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--wc-text-dim);
}

.pref-control {
  flex-shrink: 0;
  padding-top: 1px;
}

.pref-control--wide {
  flex: 1;
  min-width: 240px;
  max-width: 480px;
}

.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.theme-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--wc-border);
  border-radius: 8px;
  background: var(--wc-input-bg);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s;
}

.theme-card:hover {
  border-color: var(--wc-border-light);
}

.theme-card.active {
  border-color: var(--wc-accent);
  box-shadow: 0 0 0 1px var(--wc-accent);
}

.theme-preview {
  display: block;
  width: 100%;
  height: 48px;
  border-radius: 4px;
  border: 1px solid var(--wc-border);
}

.theme-preview[data-theme-preview='vscode'] {
  background: linear-gradient(90deg, #181818 28%, #252526 28%, #1e1e1e 28%);
}

.theme-preview[data-theme-preview='aura-light'] {
  background: linear-gradient(90deg, #ebebeb 28%, #f5f5f5 28%, #ffffff 28%);
}

.theme-preview[data-theme-preview='aura-dark'] {
  background: linear-gradient(90deg, #141414 28%, #242424 28%, #1c1c1c 28%);
}

.theme-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--wc-text);
}

.theme-desc {
  font-size: 11px;
  color: var(--wc-text-dim);
}

.pref-input {
  width: 100%;
  padding: 6px 10px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  color: var(--wc-text);
  text-align: right;
}

.pref-input.narrow {
  width: 72px;
}

.output-style-select {
  width: 100%;
  padding: 6px 10px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  color: var(--wc-text);
  font-size: 12px;
}

.pref-item--stack {
  flex-wrap: wrap;
}

.sound-row {
  flex-basis: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding: 0 0 8px 0;
}

.sound-btn {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  background: var(--wc-input-bg);
  color: var(--wc-text);
}

.sound-btn:hover:not(:disabled) {
  background: var(--wc-hover);
}

.sound-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sound-file {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--wc-text-muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sound-clear {
  padding: 0 4px;
  font-size: 14px;
  line-height: 1;
  color: var(--wc-text-dim);
}

.sound-clear:hover {
  color: var(--wc-text);
}
</style>

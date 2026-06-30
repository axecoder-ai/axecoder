<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '../../i18n'
import type { AgentOutputStyleId, AppLocale, AppSettings, AppTheme } from '../../types/axecoder'
import { LOCALE_OPTIONS } from '@shared/i18n'
import SwitchToggle from './SwitchToggle.vue'
import GitForgeSettingsCard from './GitForgeSettingsCard.vue'

const props = defineProps<{
  settings: AppSettings
  projectRoot?: string
}>()

const emit = defineEmits<{
  save: [partial: Partial<AppSettings>]
}>()

const { t } = useI18n()

const themes = computed(() => [
  { id: 'vscode' as AppTheme, label: t('settings.theme.vscode'), desc: t('settings.theme.vscodeDesc') },
  {
    id: 'aura-light' as AppTheme,
    label: t('settings.theme.auraLight'),
    desc: t('settings.theme.auraLightDesc'),
  },
  {
    id: 'aura-dark' as AppTheme,
    label: t('settings.theme.auraDark'),
    desc: t('settings.theme.auraDarkDesc'),
  },
  {
    id: 'claude' as AppTheme,
    label: t('settings.theme.claude'),
    desc: t('settings.theme.claudeDesc'),
  },
])

const outputStyles = computed(() => [
  {
    id: 'default' as AgentOutputStyleId,
    label: t('settings.agent.outputStyle'),
    desc: t('agentHelp.standardAssistant'),
  },
  { id: 'Explanatory' as AgentOutputStyleId, label: 'Explanatory', desc: 'Explanatory' },
  { id: 'Learning' as AgentOutputStyleId, label: 'Learning', desc: 'Learning' },
])

const pickTheme = (id: AppTheme) => {
  if (id === props.settings.theme) return
  emit('save', { theme: id })
}

const pickLocale = (id: AppLocale) => {
  if (id === props.settings.locale) return
  emit('save', { locale: id })
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

const onAgentOsSandbox = (v: boolean) => {
  emit('save', { agentOsSandboxEnabled: v })
}

const onAgentAutoPlan = (v: boolean) => {
  emit('save', { agentAutoPlan: v ? 'on' : 'off' })
}

const onAgentSmartMode = (v: boolean) => {
  emit('save', { agentSmartModeApproval: v })
}

const onAutoPlanClassifierModel = (e: Event) => {
  const v = (e.target as HTMLInputElement).value.trim()
  emit('save', { agentAutoPlanClassifierModelId: v })
}

const onLoopGuard = (v: boolean) => {
  emit('save', { agentLoopGuardEnabled: v })
}

const onLoopGuardStorm = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(n) || n < 1 || n > 20) return
  if (n === (props.settings.agentLoopGuardStormThreshold ?? 3)) return
  emit('save', { agentLoopGuardStormThreshold: Math.floor(n) })
}

const onLoopGuardRepeat = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(n) || n < 1 || n > 20) return
  if (n === (props.settings.agentLoopGuardRepeatSuccessThreshold ?? 2)) return
  emit('save', { agentLoopGuardRepeatSuccessThreshold: Math.floor(n) })
}

const onMaxToolRounds = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(n) || n < 0 || n > 500) return
  if (n === (props.settings.agentMaxToolRounds ?? 0)) return
  emit('save', { agentMaxToolRounds: Math.floor(n) })
}

const onAi524MaxRetries = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(n) || n < 0 || n > 10) return
  if (n === (props.settings.aiRequestMaxRetries ?? 2)) return
  emit('save', { aiRequestMaxRetries: Math.floor(n) })
}

const onAiRateLimitRetryDelaySec = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (!Number.isFinite(n) || n < 5 || n > 300) return
  if (n === (props.settings.aiRateLimitRetryDelaySec ?? 60)) return
  emit('save', { aiRateLimitRetryDelaySec: Math.floor(n) })
}

const onWebRunEnabled = (v: boolean) => {
  emit('save', { agentFeatureWebRun: v, agentFeatureWebSearch: v })
}

const onWebSearchApiKey = (e: Event) => {
  const v = (e.target as HTMLInputElement).value
  emit('save', { agentWebSearchApiKey: v })
}

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

const onTerminalShell = (e: Event) => {
  emit('save', { terminalShell: (e.target as HTMLInputElement).value })
}

const onTerminalArgs = (e: Event) => {
  const raw = (e.target as HTMLInputElement).value.trim()
  emit('save', { terminalShellArgs: raw ? raw.split(/\s+/) : [] })
}

const onMinimap = (v: boolean) => {
  emit('save', { editorMinimap: v })
}

const onSemanticHl = (v: boolean) => {
  emit('save', { editorSemanticHighlighting: v })
}
</script>

<template>
  <div class="general-tab">
    <h2>{{ t('settings.title') }}</h2>

    <section class="section">
      <h3 class="section-title">{{ t('settings.locale.title') }}</h3>
      <p class="section-desc">{{ t('settings.locale.desc') }}</p>
      <div class="locale-row">
        <button
          v-for="opt in LOCALE_OPTIONS"
          :key="opt.id"
          type="button"
          class="locale-btn"
          :class="{ active: (settings.locale ?? 'en') === opt.id }"
          @click="pickLocale(opt.id)"
        >
          {{ t(opt.labelKey) }}
        </button>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">{{ t('settings.theme.title') }}</h3>
      <p class="section-desc">{{ t('settings.theme.desc') }}</p>
      <div class="theme-grid">
        <button
          v-for="th in themes"
          :key="th.id"
          type="button"
          class="theme-card"
          :class="{ active: settings.theme === th.id }"
          @click="pickTheme(th.id)"
        >
          <span class="theme-preview" :data-theme-preview="th.id" />
          <span class="theme-label">{{ th.label }}</span>
          <span class="theme-desc">{{ th.desc }}</span>
        </button>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">{{ t('settings.agent.title') }}</h3>
      <p class="section-desc">{{ t('settings.agent.desc') }}</p>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.autoApply') }}</span>
          <p class="pref-hint">{{ t('settings.agent.autoApplyHint') }}</p>
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
          <span class="pref-label">{{ t('settings.agent.osSandbox') }}</span>
          <p class="pref-hint">{{ t('settings.agent.osSandboxHint') }}</p>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="settings.agentOsSandboxEnabled !== false"
            @update:model-value="onAgentOsSandbox"
          />
        </div>
      </div>
      <div class="pref-item pref-item--stack">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.webRun') }}</span>
          <p class="pref-hint">{{ t('settings.agent.webRunHint') }}</p>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="!!settings.agentFeatureWebRun"
            @update:model-value="onWebRunEnabled"
          />
        </div>
        <div class="sound-row">
          <input
            type="password"
            class="pref-input pref-input--wide"
            :placeholder="t('settings.agent.webSearchApiKey')"
            :value="settings.agentWebSearchApiKey ?? ''"
            @change="onWebSearchApiKey"
          />
          <p class="pref-hint pref-hint--inline">{{ t('settings.agent.webSearchCloudHint') }}</p>
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.smartModeApproval') }}</span>
          <p class="pref-hint">{{ t('settings.agent.smartModeApprovalHint') }}</p>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="settings.agentSmartModeApproval !== false"
            @update:model-value="onAgentSmartMode"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.autoPlanEnabled') }}</span>
          <p class="pref-hint">{{ t('settings.agent.autoPlanEnabledHint') }}</p>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="settings.agentAutoPlan !== 'off'"
            @update:model-value="onAgentAutoPlan"
          />
        </div>
      </div>
      <div class="pref-item pref-item--stack">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.autoPlanClassifierModel') }}</span>
          <p class="pref-hint">{{ t('settings.agent.autoPlanClassifierModelHint') }}</p>
        </div>
        <input
          type="text"
          class="pref-input"
          :value="settings.agentAutoPlanClassifierModelId ?? ''"
          placeholder="model entry id (optional)"
          @change="onAutoPlanClassifierModel"
        />
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.loopGuard') }}</span>
          <p class="pref-hint">{{ t('settings.agent.loopGuardHint') }}</p>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="settings.agentLoopGuardEnabled !== false"
            @update:model-value="onLoopGuard"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.loopGuardStormThreshold') }}</span>
          <p class="pref-hint">{{ t('settings.agent.loopGuardStormThresholdHint') }}</p>
        </div>
        <div class="pref-control">
          <input
            type="number"
            class="delay-input"
            min="1"
            max="20"
            step="1"
            :value="settings.agentLoopGuardStormThreshold ?? 3"
            @change="onLoopGuardStorm"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.loopGuardRepeatThreshold') }}</span>
          <p class="pref-hint">{{ t('settings.agent.loopGuardRepeatThresholdHint') }}</p>
        </div>
        <div class="pref-control">
          <input
            type="number"
            class="delay-input"
            min="1"
            max="20"
            step="1"
            :value="settings.agentLoopGuardRepeatSuccessThreshold ?? 2"
            @change="onLoopGuardRepeat"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.maxToolRounds') }}</span>
          <p class="pref-hint">{{ t('settings.agent.maxToolRoundsHint') }}</p>
        </div>
        <div class="pref-control">
          <input
            type="number"
            class="delay-input"
            min="0"
            max="500"
            step="1"
            :value="settings.agentMaxToolRounds ?? 0"
            @change="onMaxToolRounds"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.ai524MaxRetries') }}</span>
          <p class="pref-hint">{{ t('settings.agent.ai524MaxRetriesHint') }}</p>
        </div>
        <div class="pref-control">
          <input
            type="number"
            class="delay-input"
            min="0"
            max="10"
            step="1"
            :value="settings.aiRequestMaxRetries ?? 2"
            @change="onAi524MaxRetries"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.aiRateLimitRetryDelaySec') }}</span>
          <p class="pref-hint">{{ t('settings.agent.aiRateLimitRetryDelaySecHint') }}</p>
        </div>
        <div class="pref-control">
          <input
            type="number"
            class="delay-input"
            min="5"
            max="300"
            step="1"
            :value="settings.aiRateLimitRetryDelaySec ?? 60"
            @change="onAiRateLimitRetryDelaySec"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.agent.outputStyle') }}</span>
          <p class="pref-hint">{{ t('settings.agent.outputStyleHint') }}</p>
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
          <span class="pref-label">{{ t('settings.agent.completionSound') }}</span>
          <p class="pref-hint">{{ t('settings.agent.completionSoundHint') }}</p>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="!!settings.agentCompletionSoundEnabled"
            @update:model-value="onCompletionSoundEnabled"
          />
        </div>
        <div v-if="settings.agentCompletionSoundEnabled" class="sound-row">
          <button type="button" class="sound-btn" @click="browseCompletionSound">
            {{ t('settings.agent.browse') }}
          </button>
          <button
            type="button"
            class="sound-btn"
            :disabled="!settings.agentCompletionSoundPath"
            @click="previewCompletionSound"
          >
            {{ t('settings.agent.preview') }}
          </button>
          <span v-if="soundLabel()" class="sound-file">
            {{ soundLabel() }}
            <button
              type="button"
              class="sound-clear"
              :title="t('settings.agent.clear')"
              @click="clearCompletionSound"
            >
              ×
            </button>
          </span>
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">{{ t('settings.editor.title') }}</h3>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.editor.autoSave') }}</span>
        </div>
        <div class="pref-control">
          <SwitchToggle :model-value="!!settings.autoSave" @update:model-value="onAutoSave" />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">{{ t('settings.editor.autoSaveDelay') }}</span>
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
          <span class="pref-label">{{ t('settings.editor.fontSize') }}</span>
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
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">Minimap</span>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="!!settings.editorMinimap"
            @update:model-value="onMinimap"
          />
        </div>
      </div>
      <div class="pref-item">
        <div class="pref-info">
          <span class="pref-label">Semantic highlighting</span>
        </div>
        <div class="pref-control">
          <SwitchToggle
            :model-value="!!settings.editorSemanticHighlighting"
            @update:model-value="onSemanticHl"
          />
        </div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Terminal</h3>
      <div class="pref-item pref-item--stack">
        <div class="pref-info">
          <span class="pref-label">Shell</span>
        </div>
        <input
          type="text"
          class="pref-input"
          :value="settings.terminalShell ?? ''"
          placeholder="/bin/zsh"
          @change="onTerminalShell"
        />
      </div>
      <div class="pref-item pref-item--stack">
        <div class="pref-info">
          <span class="pref-label">Shell args</span>
        </div>
        <input
          type="text"
          class="pref-input"
          :value="(settings.terminalShellArgs ?? []).join(' ')"
          placeholder="-l"
          @change="onTerminalArgs"
        />
      </div>
    </section>

    <GitForgeSettingsCard :settings="settings" :project-root="projectRoot" @save="emit('save', $event)" />
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

.locale-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.locale-btn {
  padding: 8px 16px;
  font-size: 13px;
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  background: var(--wc-input-bg);
  color: var(--wc-text);
  cursor: pointer;
}

.locale-btn.active {
  border-color: var(--wc-accent);
  box-shadow: 0 0 0 1px var(--wc-accent);
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

.pref-hint--inline {
  margin-top: 6px;
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

.theme-preview[data-theme-preview='claude'] {
  background: linear-gradient(90deg, #ebebeb 28%, #f5f5f5 28%, #f2efe9 28%);
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

.seg-row {
  display: flex;
  gap: 4px;
}

.seg-btn {
  padding: 6px 12px;
  font-size: 12px;
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  background: var(--wc-input-bg);
  color: var(--wc-text-muted);
}

.seg-btn.active {
  background: var(--wc-accent, #0078d4);
  border-color: transparent;
  color: #fff;
}
</style>

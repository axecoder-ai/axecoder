<script setup lang="ts">
import type { AgentOutputStyleId, AppSettings, AppTheme } from '../../types/axecoder'

const props = defineProps<{
  settings: AppSettings
}>()

const emit = defineEmits<{
  save: [partial: Partial<AppSettings>]
}>()

const themes: { id: AppTheme; label: string; desc: string }[] = [
  { id: 'vscode', label: 'VS Code 深色', desc: '经典编辑器深色' },
  { id: 'aura-light', label: 'Aura 浅色', desc: '柔和浅灰背景' },
  { id: 'aura-dark', label: 'Aura 深色', desc: '低对比深色界面' },
]

const pickTheme = (id: AppTheme) => {
  if (id === props.settings.theme) return
  emit('save', { theme: id })
}

const onAutoSave = (e: Event) => {
  emit('save', { autoSave: (e.target as HTMLInputElement).checked })
}

const onDelay = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (n >= 200) emit('save', { autoSaveDelay: n })
}

const onFontSize = (e: Event) => {
  const n = Number((e.target as HTMLInputElement).value)
  if (n >= 10 && n <= 24) emit('save', { fontSize: n })
}

const onAgentAutoApply = (e: Event) => {
  emit('save', { agentAutoApplyWrites: (e.target as HTMLInputElement).checked })
}

const outputStyles: { id: AgentOutputStyleId; label: string; desc: string }[] = [
  { id: 'default', label: '默认', desc: '标准软件工程助手' },
  { id: 'Explanatory', label: '讲解', desc: '完成任务时附带代码库洞察' },
  { id: 'Learning', label: '学习', desc: '协作式动手练习与 Insights' },
]

const onOutputStyle = (e: Event) => {
  const v = (e.target as HTMLSelectElement).value as AgentOutputStyleId
  if (v === props.settings.agentOutputStyle) return
  emit('save', { agentOutputStyle: v })
}
</script>

<template>
  <div class="general-tab">
    <h2>General</h2>

    <section class="section">
      <h3 class="section-title">配色方案</h3>
      <p class="section-desc">选择界面主题，立即生效</p>
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
      <p class="section-desc">对话中 Agent 修改项目文件时的确认行为</p>
      <label class="pref-row">
        <span class="pref-label">自动应用写盘变更</span>
        <input
          type="checkbox"
          :checked="settings.agentAutoApplyWrites"
          @change="onAgentAutoApply"
        />
      </label>
      <p class="section-desc hint">开启后 Write / Edit / Delete / Move 将直接写入磁盘，不再显示「应用 / 拒绝」</p>
      <label class="pref-row output-style-row">
        <span class="pref-label">输出风格</span>
        <select
          class="output-style-select"
          :value="settings.agentOutputStyle"
          @change="onOutputStyle"
        >
          <option v-for="s in outputStyles" :key="s.id" :value="s.id">
            {{ s.label }} — {{ s.desc }}
          </option>
        </select>
      </label>
      <p class="section-desc hint">影响新发起的 Agent 会话系统提示（对齐 Claude Code Explanatory / Learning）</p>
    </section>

    <section class="section">
      <h3 class="section-title">编辑器</h3>
      <label class="pref-row">
        <span class="pref-label">自动保存</span>
        <input
          type="checkbox"
          :checked="settings.autoSave"
          @change="onAutoSave"
        />
      </label>
      <label class="pref-row">
        <span class="pref-label">自动保存延迟（毫秒）</span>
        <input
          type="number"
          class="pref-input"
          min="200"
          step="100"
          :value="settings.autoSaveDelay"
          @change="onDelay"
        />
      </label>
      <label class="pref-row">
        <span class="pref-label">编辑器字号</span>
        <input
          type="number"
          class="pref-input narrow"
          min="10"
          max="24"
          :value="settings.fontSize"
          @change="onFontSize"
        />
      </label>
    </section>
  </div>
</template>

<style scoped>
.general-tab {
  padding: 24px 32px;
  max-width: 720px;
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
  margin: 0 0 16px;
  font-size: 12px;
  color: var(--wc-text-dim);
}

.section-desc.hint {
  margin: -4px 0 0;
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

.pref-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--wc-border);
  font-size: 13px;
}

.pref-label {
  color: var(--wc-text);
}

.pref-input {
  width: 120px;
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

.output-style-row {
  flex-wrap: wrap;
}

.output-style-select {
  flex: 1;
  min-width: 200px;
  max-width: 420px;
  padding: 6px 10px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 6px;
  color: var(--wc-text);
  font-size: 12px;
}
</style>

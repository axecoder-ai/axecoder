<script setup lang="ts">
import { ref, watch, nextTick, onUnmounted } from 'vue'

const props = defineProps<{
  visible: boolean
  projectRoot: string
}>()

const tab = ref<'terminal' | 'output' | 'problems'>('terminal')
const terminalOut = ref('')
const terminalIn = ref('')
const outputLog = ref<string[]>([])
const problems = ref<{ message: string }[]>([])
const terminalInput = ref<HTMLInputElement | null>(null)
const outEl = ref<HTMLElement | null>(null)

let offTerminal: (() => void) | null = null

const appendOut = (text: string) => {
  terminalOut.value += text
  nextTick(() => {
    if (outEl.value) outEl.value.scrollTop = outEl.value.scrollHeight
  })
}

const startTerminal = async () => {
  terminalOut.value = ''
  await window.writcraft.terminalStart(props.projectRoot || '')
}

const sendLine = async () => {
  const line = terminalIn.value
  if (!line.trim()) return
  await window.writcraft.terminalWrite(line + (line.endsWith('\n') ? '' : '\n'))
  terminalIn.value = ''
}

watch(
  () => [props.visible, props.projectRoot] as const,
  async ([vis]) => {
    if (vis && tab.value === 'terminal') {
      offTerminal?.()
      offTerminal = window.writcraft.onTerminalData(appendOut)
      await startTerminal()
    }
  },
)

watch(tab, async (t) => {
  if (t === 'terminal' && props.visible) {
    offTerminal?.()
    offTerminal = window.writcraft.onTerminalData(appendOut)
    if (!terminalOut.value) await startTerminal()
  }
})

onUnmounted(() => {
  offTerminal?.()
  void window.writcraft.terminalStop()
})

const addOutput = (msg: string) => {
  outputLog.value = [...outputLog.value.slice(-199), msg]
}

const setProblems = (list: { message: string }[]) => {
  problems.value = list
}

defineExpose({ addOutput, setProblems })
</script>

<template>
  <section v-show="visible" class="bottom-panel">
    <div class="panel-tabs">
      <button type="button" :class="{ active: tab === 'terminal' }" @click="tab = 'terminal'">终端</button>
      <button type="button" :class="{ active: tab === 'output' }" @click="tab = 'output'">输出</button>
      <button type="button" :class="{ active: tab === 'problems' }" @click="tab = 'problems'">
        问题
        <span v-if="problems.length" class="badge">{{ problems.length }}</span>
      </button>
    </div>
    <div v-show="tab === 'terminal'" class="panel-content terminal">
      <pre ref="outEl" class="terminal-out">{{ terminalOut }}</pre>
      <div class="terminal-in-row">
        <span class="prompt">$</span>
        <input
          ref="terminalInput"
          v-model="terminalIn"
          class="terminal-in"
          placeholder="输入命令后回车"
          @keydown.enter="sendLine"
        />
      </div>
    </div>
    <div v-show="tab === 'output'" class="panel-content">
      <div v-if="!outputLog.length" class="empty">暂无输出</div>
      <pre v-for="(line, i) in outputLog" :key="i" class="log-line">{{ line }}</pre>
    </div>
    <div v-show="tab === 'problems'" class="panel-content">
      <div v-if="!problems.length" class="empty">未发现问题</div>
      <ul v-else class="problem-list">
        <li v-for="(p, i) in problems" :key="i">{{ p.message }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.bottom-panel {
  height: 220px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background: var(--wc-panel);
  border-top: 1px solid var(--wc-border);
}

.panel-tabs {
  display: flex;
  height: 28px;
  background: var(--wc-bg-dark);
  border-bottom: 1px solid var(--wc-border);
}

.panel-tabs button {
  padding: 0 14px;
  font-size: 11px;
  color: var(--wc-text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-tabs button.active {
  color: var(--wc-text);
  background: var(--wc-panel);
  border-top: 1px solid var(--wc-accent);
}

.badge {
  background: var(--wc-accent);
  color: #fff;
  font-size: 10px;
  padding: 0 5px;
  border-radius: 8px;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 8px 12px;
  font-size: 12px;
  font-family: ui-monospace, Menlo, monospace;
}

.terminal {
  display: flex;
  flex-direction: column;
  padding: 0;
}

.terminal-out {
  flex: 1;
  overflow: auto;
  padding: 8px 12px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-in-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-top: 1px solid var(--wc-border);
  flex-shrink: 0;
}

.prompt {
  color: var(--wc-accent);
}

.terminal-in {
  flex: 1;
  padding: 4px 0;
  background: transparent;
}

.empty {
  color: var(--wc-text-muted);
}

.log-line {
  margin: 0 0 4px;
  white-space: pre-wrap;
}

.problem-list {
  list-style: none;
}

.problem-list li {
  padding: 4px 0;
  color: #f48771;
}
</style>

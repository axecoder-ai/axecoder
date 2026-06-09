<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { useAgentStore } from '../../stores/agentStore'
import { parseToolCall, formatToolCall, parseToolResult } from '../../utils/thinking-parser'
import { estimateTokens } from '../../utils/token-estimator'

const store = useAgentStore()
const contentRef = ref<HTMLElement | null>(null)
const searchVisible = ref(false)
const searchQuery = ref('')

// 过滤 chunks（搜索）
const filteredChunks = computed(() => {
  if (!searchQuery.value) return store.thinkingChunks
  
  const query = searchQuery.value.toLowerCase()
  return store.thinkingChunks.filter(chunk => 
    chunk.content.toLowerCase().includes(query)
  )
})

// 切换折叠
function toggleChunk(id: string) {
  store.toggleChunkCollapse(id)
}

// 导出
function exportThinking() {
  const content = store.thinkingChunks
    .map((chunk) => {
      const timestamp = new Date(chunk.timestamp).toLocaleTimeString('zh-CN')
      return `[${timestamp}] [${chunk.type}]\n${chunk.content}\n`
    })
    .join('\n---\n\n')
  
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `thinking-${Date.now()}.txt`
  a.click()
  URL.revokeObjectURL(url)
}

// 复制
function copyChunk(content: string) {
  navigator.clipboard.writeText(content)
}

// 工具函数
function getChunkTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    tool_call: '🔧 工具调用',
    tool_result: '📦 返回结果',
    reasoning: '💭 推理过程',
  }
  return labels[type] || type
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatChunkContent(chunk: any): string {
  if (chunk.type === 'tool_call') {
    const parsed = parseToolCall(chunk.content)
    return parsed ? formatToolCall(parsed) : chunk.content
  }
  if (chunk.type === 'tool_result') {
    return parseToolResult(chunk.content)
  }
  return chunk.content
}

// 自动滚动到底部
watch(() => store.thinkingChunks.length, () => {
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTop = contentRef.value.scrollHeight
    }
  })
})
</script>

<template>
  <div class="thinking-panel">
    <!-- 头部 -->
    <div class="thinking-header">
      <div class="thinking-title">
        <span class="title-icon">🧠</span>
        <span class="title-text">AI 思考过程</span>
        <span class="title-badge">{{ store.thinkingChunks.length }}</span>
      </div>
      
      <div class="thinking-stats">
        <span class="stat-item">{{ store.totalTokens.value }} tokens</span>
        <span class="stat-item">{{ store.toolCallCount.value }} 工具调用</span>
      </div>
      
      <div class="thinking-actions">
        <button 
          type="button" 
          class="action-btn" 
          title="全部展开"
          @click="store.expandAll"
        >
          ⊕
        </button>
        <button 
          type="button" 
          class="action-btn" 
          title="全部折叠"
          @click="store.collapseAll"
        >
          ⊖
        </button>
        <button 
          type="button" 
          class="action-btn" 
          title="搜索"
          @click="searchVisible = !searchVisible"
        >
          🔍
        </button>
        <button 
          type="button" 
          class="action-btn" 
          title="导出"
          @click="exportThinking"
        >
          ⬇
        </button>
      </div>
    </div>
    
    <!-- 搜索框 -->
    <div v-if="searchVisible" class="thinking-search">
      <input 
        v-model="searchQuery" 
        type="text"
        class="search-input"
        placeholder="搜索 thinking 内容..."
      />
    </div>
    
    <!-- Thinking 内容列表 -->
    <div class="thinking-content" ref="contentRef">
      <div 
        v-for="chunk in filteredChunks" 
        :key="chunk.id"
        :class="['thinking-chunk', `chunk-${chunk.type}`]"
      >
        <!-- Chunk 头部 -->
        <div class="chunk-header" @click="toggleChunk(chunk.id)">
          <span class="chunk-arrow">{{ chunk.collapsed ? '▸' : '▾' }}</span>
          <span class="chunk-type">{{ getChunkTypeLabel(chunk.type) }}</span>
          <span class="chunk-time">{{ formatTime(chunk.timestamp) }}</span>
          <span class="chunk-tokens">{{ estimateTokens(chunk.content) }}t</span>
        </div>
        
        <!-- Chunk 内容 -->
        <div v-if="!chunk.collapsed" class="chunk-content">
          <pre class="chunk-text">{{ formatChunkContent(chunk) }}</pre>
          <button 
            type="button"
            class="copy-btn" 
            title="复制"
            @click.stop="copyChunk(chunk.content)"
          >
            📋
          </button>
        </div>
      </div>
      
      <div v-if="filteredChunks.length === 0 && searchQuery" class="no-results">
        未找到匹配的内容
      </div>
    </div>
  </div>
</template>

<style scoped>
.thinking-panel {
  font-family: ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  background: var(--wc-chat-box-bg, var(--wc-input-bg));
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px var(--wc-border);
  margin-bottom: 12px;
  overflow: hidden;
}

.thinking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--wc-border);
  gap: 12px;
}

.thinking-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--wc-text);
  font-weight: 600;
}

.title-icon {
  font-size: 14px;
}

.title-badge {
  display: inline-block;
  min-width: 18px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  color: var(--wc-bg);
  background: var(--wc-accent, #7aa2f7);
  border-radius: 9px;
}

.thinking-stats {
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: var(--wc-text-dim);
}

.thinking-actions {
  display: flex;
  gap: 4px;
}

.action-btn {
  padding: 2px 6px;
  border: none;
  background: transparent;
  color: var(--wc-text-dim);
  font-size: 14px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.15s;
}

.action-btn:hover {
  background: var(--wc-border);
  color: var(--wc-text);
}

.thinking-search {
  padding: 8px 12px;
  border-bottom: 1px solid var(--wc-border);
}

.search-input {
  width: 100%;
  padding: 4px 8px;
  background: var(--wc-input-bg);
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  color: var(--wc-text);
  font-family: inherit;
  font-size: 11px;
  outline: none;
}

.search-input:focus {
  border-color: var(--wc-accent, #7aa2f7);
}

.thinking-content {
  max-height: 400px;
  overflow-y: auto;
  padding: 8px;
}

.thinking-chunk {
  margin-bottom: 6px;
  border: 1px solid var(--wc-border);
  border-radius: 4px;
  overflow: hidden;
}

.chunk-tool_call {
  border-left: 3px solid #7aa2f7;
}

.chunk-tool_result {
  border-left: 3px solid #3d9a5f;
}

.chunk-reasoning {
  border-left: 3px solid #e0af68;
}

.chunk-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: var(--wc-input-bg);
  cursor: pointer;
  user-select: none;
}

.chunk-header:hover {
  background: var(--wc-border);
}

.chunk-arrow {
  width: 12px;
  font-size: 10px;
  color: var(--wc-text-dim);
}

.chunk-type {
  font-weight: 600;
  color: var(--wc-text);
  font-size: 11px;
}

.chunk-time {
  margin-left: auto;
  font-size: 10px;
  color: var(--wc-text-dim);
}

.chunk-tokens {
  font-size: 10px;
  color: var(--wc-text-dim);
}

.chunk-content {
  position: relative;
  padding: 8px;
  background: var(--wc-chat-box-bg, var(--wc-input-bg));
}

.chunk-text {
  margin: 0;
  padding: 6px 8px;
  background: var(--wc-input-bg);
  border-radius: 4px;
  overflow-x: auto;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--wc-text-dim);
  font-family: inherit;
}

.copy-btn {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 2px 6px;
  border: none;
  background: var(--wc-border);
  color: var(--wc-text-dim);
  font-size: 12px;
  cursor: pointer;
  border-radius: 3px;
  opacity: 0;
  transition: opacity 0.15s;
}

.chunk-content:hover .copy-btn {
  opacity: 1;
}

.copy-btn:hover {
  background: var(--wc-accent, #7aa2f7);
  color: var(--wc-bg);
}

.no-results {
  padding: 24px;
  text-align: center;
  color: var(--wc-text-dim);
  font-size: 11px;
}

/* 滚动条样式 */
.thinking-content::-webkit-scrollbar {
  width: 6px;
}

.thinking-content::-webkit-scrollbar-track {
  background: transparent;
}

.thinking-content::-webkit-scrollbar-thumb {
  background: var(--wc-border);
  border-radius: 3px;
}

.thinking-content::-webkit-scrollbar-thumb:hover {
  background: var(--wc-text-dim);
}
</style>

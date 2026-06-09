# 方案文档：AI Thinking 过程输出展示

**状态：** 已确认  
**方案编号：** 方案 C - 完整重构  
**创建时间：** 2025-01-XX  
**最后更新：** 2025-01-XX  

---

## 1. 背景与目标

### 1.1 需求背景

当前 AxeCoder 在 AI 回答问题时，用户无法看到 AI 的 thinking 过程（包括 Model Call 和 Tool Result 等中间步骤），导致：
- 用户不清楚 AI 正在做什么
- 难以理解 AI 的推理路径
- 无法判断 AI 是否在正确方向上工作

### 1.2 目标

实现一个**完整的 Thinking 展示系统**，包括：
1. **独立组件**：将 thinking 内容与最终回答分离展示
2. **结构化显示**：区分工具调用、返回结果、推理过程
3. **交互增强**：支持展开/折叠、搜索、复制、导出
4. **统计功能**：显示 token 消耗、工具调用次数等
5. **良好体验**：流式更新、性能优化、响应式布局

---

## 2. 方案设计

### 2.1 整体架构

```
┌─────────────────────────────────────┐
│   AgentProgressStream.vue (主容器)   │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  ThinkingPanel.vue (新组件)   │  │
│  │  - 独立面板                    │  │
│  │  - 流式更新 thinking 内容      │  │
│  │  - 结构化解析与展示            │  │
│  │  - 搜索/导出/折叠等交互        │  │
│  └──────────────────────────────┘  │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  回答内容区域 (现有)          │  │
│  │  - 显示 AI 最终回答            │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 2.2 核心改动点

#### 2.2.1 后端改动（Electron 主进程）

**文件：`electron/main/agent/agent-loop.ts`**

当前代码结构（伪代码）：
```typescript
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    // 统一发送到前端
    sendToRenderer('agent:stream', { delta: chunk.delta.text });
  }
}
```

**修改为**：
```typescript
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    const deltaType = chunk.delta.type; // 'text_delta' | 'thinking_delta'
    
    if (deltaType === 'text_delta') {
      // 最终回答内容
      sendToRenderer('agent:stream:content', { 
        delta: chunk.delta.text 
      });
    } else if (deltaType === 'thinking_delta') {
      // thinking 过程
      sendToRenderer('agent:stream:thinking', { 
        delta: chunk.delta.text,
        metadata: {
          timestamp: Date.now(),
          type: detectThinkingType(chunk.delta.text) // 'tool_call' | 'tool_result' | 'reasoning'
        }
      });
    }
  }
}
```

**新增工具函数**：
```typescript
// 检测 thinking 内容类型
function detectThinkingType(text: string): 'tool_call' | 'tool_result' | 'reasoning' {
  if (text.includes('<function_calls>')) return 'tool_call';
  if (text.includes('<function_results>')) return 'tool_result';
  return 'reasoning';
}
```

#### 2.2.2 IPC 类型定义

**文件：`electron/main/types/ipc.ts`**

```typescript
// 新增 IPC 事件
export interface AgentStreamThinkingPayload {
  delta: string;
  metadata: {
    timestamp: number;
    type: 'tool_call' | 'tool_result' | 'reasoning';
  };
}

export interface AgentStreamContentPayload {
  delta: string;
}

// 更新 IPC 通道定义
export const IPC_CHANNELS = {
  // ... 现有通道
  AGENT_STREAM_THINKING: 'agent:stream:thinking',
  AGENT_STREAM_CONTENT: 'agent:stream:content',
} as const;
```

#### 2.2.3 前端状态管理

**文件：`src/stores/agentStore.ts`（或新建）**

```typescript
import { defineStore } from 'pinia';

export interface ThinkingChunk {
  id: string;
  type: 'tool_call' | 'tool_result' | 'reasoning';
  content: string;
  timestamp: number;
  collapsed: boolean; // 是否折叠
}

export const useAgentStore = defineStore('agent', {
  state: () => ({
    thinkingChunks: [] as ThinkingChunk[],
    contentStream: '',
    currentThinkingChunk: null as ThinkingChunk | null,
  }),
  
  actions: {
    addThinkingDelta(payload: AgentStreamThinkingPayload) {
      const { delta, metadata } = payload;
      
      // 如果是新的类型，创建新 chunk
      if (!this.currentThinkingChunk || 
          this.currentThinkingChunk.type !== metadata.type) {
        this.currentThinkingChunk = {
          id: `chunk-${Date.now()}`,
          type: metadata.type,
          content: delta,
          timestamp: metadata.timestamp,
          collapsed: false,
        };
        this.thinkingChunks.push(this.currentThinkingChunk);
      } else {
        // 追加到当前 chunk
        this.currentThinkingChunk.content += delta;
      }
    },
    
    addContentDelta(delta: string) {
      this.contentStream += delta;
    },
    
    toggleChunkCollapse(chunkId: string) {
      const chunk = this.thinkingChunks.find(c => c.id === chunkId);
      if (chunk) chunk.collapsed = !chunk.collapsed;
    },
    
    clearThinking() {
      this.thinkingChunks = [];
      this.currentThinkingChunk = null;
    },
  },
  
  getters: {
    totalTokens(): number {
      return this.thinkingChunks.reduce((sum, chunk) => 
        sum + estimateTokens(chunk.content), 0
      );
    },
    
    toolCallCount(): number {
      return this.thinkingChunks.filter(c => c.type === 'tool_call').length;
    },
  },
});

// 简单 token 估算（1 token ≈ 4 字符）
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
```

#### 2.2.4 新组件：ThinkingPanel.vue

**文件：`src/components/agent/ThinkingPanel.vue`**

```vue
<template>
  <div class="thinking-panel">
    <!-- 头部统计 -->
    <div class="thinking-header">
      <div class="thinking-title">
        <Icon name="brain" />
        <span>AI 思考过程</span>
        <Badge :count="store.thinkingChunks.length" />
      </div>
      
      <div class="thinking-stats">
        <span>Token: {{ store.totalTokens }}</span>
        <span>工具调用: {{ store.toolCallCount }}</span>
      </div>
      
      <div class="thinking-actions">
        <Button @click="expandAll" size="small">全部展开</Button>
        <Button @click="collapseAll" size="small">全部折叠</Button>
        <Button @click="searchVisible = !searchVisible" size="small">
          <Icon name="search" />
        </Button>
        <Button @click="exportThinking" size="small">
          <Icon name="download" />
        </Button>
      </div>
    </div>
    
    <!-- 搜索框 -->
    <div v-if="searchVisible" class="thinking-search">
      <Input 
        v-model="searchQuery" 
        placeholder="搜索 thinking 内容..."
        @input="onSearch"
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
          <Icon :name="chunk.collapsed ? 'chevron-right' : 'chevron-down'" />
          <span class="chunk-type">{{ getChunkTypeLabel(chunk.type) }}</span>
          <span class="chunk-time">{{ formatTime(chunk.timestamp) }}</span>
          <span class="chunk-tokens">{{ estimateTokens(chunk.content) }} tokens</span>
        </div>
        
        <!-- Chunk 内容 -->
        <div v-if="!chunk.collapsed" class="chunk-content">
          <pre v-if="chunk.type === 'tool_call'">{{ parseToolCall(chunk.content) }}</pre>
          <pre v-else-if="chunk.type === 'tool_result'">{{ parseToolResult(chunk.content) }}</pre>
          <div v-else class="reasoning-text">{{ chunk.content }}</div>
          
          <Button 
            class="copy-btn" 
            @click="copyChunk(chunk.content)"
            size="small"
          >
            复制
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import { useAgentStore } from '@/stores/agentStore';

const store = useAgentStore();
const contentRef = ref<HTMLElement | null>(null);
const searchVisible = ref(false);
const searchQuery = ref('');

// 过滤 chunks（搜索）
const filteredChunks = computed(() => {
  if (!searchQuery.value) return store.thinkingChunks;
  
  const query = searchQuery.value.toLowerCase();
  return store.thinkingChunks.filter(chunk => 
    chunk.content.toLowerCase().includes(query)
  );
});

// 切换折叠
function toggleChunk(id: string) {
  store.toggleChunkCollapse(id);
}

// 全部展开/折叠
function expandAll() {
  store.thinkingChunks.forEach(chunk => chunk.collapsed = false);
}

function collapseAll() {
  store.thinkingChunks.forEach(chunk => chunk.collapsed = true);
}

// 导出
function exportThinking() {
  const content = store.thinkingChunks
    .map(chunk => `[${chunk.type}] ${chunk.content}`)
    .join('\n\n---\n\n');
  
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `thinking-${Date.now()}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// 复制
function copyChunk(content: string) {
  navigator.clipboard.writeText(content);
  // 显示提示（可用 toast）
}

// 工具函数
function getChunkTypeLabel(type: string): string {
  const labels = {
    tool_call: '🔧 工具调用',
    tool_result: '📦 返回结果',
    reasoning: '💭 推理过程',
  };
  return labels[type] || type;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN');
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function parseToolCall(xml: string): string {
  // 简单解析，提取工具名和参数
  try {
    const match = xml.match(/<invoke name="(.+?)">/);
    if (match) return `调用工具: ${match[1]}`;
  } catch {}
  return xml;
}

function parseToolResult(xml: string): string {
  // 提取结果内容
  try {
    const match = xml.match(/<function_results>([\s\S]*?)<\/function_results>/);
    if (match) return match[1].trim();
  } catch {}
  return xml;
}

// 自动滚动到底部
watch(() => store.thinkingChunks.length, () => {
  nextTick(() => {
    if (contentRef.value) {
      contentRef.value.scrollTop = contentRef.value.scrollHeight;
    }
  });
});
</script>

<style scoped lang="scss">
.thinking-panel {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  margin-bottom: 16px;
  background: var(--bg-secondary);
}

.thinking-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  
  .thinking-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
  
  .thinking-stats {
    display: flex;
    gap: 16px;
    font-size: 13px;
    color: var(--text-secondary);
  }
  
  .thinking-actions {
    display: flex;
    gap: 8px;
  }
}

.thinking-search {
  padding: 8px 16px;
  border-bottom: 1px solid var(--border-color);
}

.thinking-content {
  max-height: 500px;
  overflow-y: auto;
  padding: 8px;
}

.thinking-chunk {
  margin-bottom: 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  
  &.chunk-tool_call {
    border-left: 3px solid #3b82f6;
  }
  
  &.chunk-tool_result {
    border-left: 3px solid #10b981;
  }
  
  &.chunk-reasoning {
    border-left: 3px solid #f59e0b;
  }
}

.chunk-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  background: var(--bg-tertiary);
  
  &:hover {
    background: var(--bg-hover);
  }
  
  .chunk-type {
    font-weight: 500;
  }
  
  .chunk-time, .chunk-tokens {
    font-size: 12px;
    color: var(--text-secondary);
  }
}

.chunk-content {
  padding: 12px;
  position: relative;
  
  pre {
    background: var(--code-bg);
    padding: 12px;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 13px;
  }
  
  .reasoning-text {
    line-height: 1.6;
    white-space: pre-wrap;
  }
  
  .copy-btn {
    position: absolute;
    top: 8px;
    right: 8px;
  }
}
</style>
```

#### 2.2.5 集成到 AgentProgressStream.vue

**文件：`src/components/agent/AgentProgressStream.vue`**

```vue
<template>
  <div class="agent-progress-stream">
    <!-- 新增：Thinking 面板 -->
    <ThinkingPanel v-if="store.thinkingChunks.length > 0" />
    
    <!-- 现有：回答内容 -->
    <div class="answer-content">
      <Markdown :content="store.contentStream" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useAgentStore } from '@/stores/agentStore';
import ThinkingPanel from './ThinkingPanel.vue';

const store = useAgentStore();

onMounted(() => {
  // 监听 thinking 流
  window.ipc.on('agent:stream:thinking', (payload) => {
    store.addThinkingDelta(payload);
  });
  
  // 监听 content 流
  window.ipc.on('agent:stream:content', (payload) => {
    store.addContentDelta(payload.delta);
  });
});

onUnmounted(() => {
  window.ipc.removeAllListeners('agent:stream:thinking');
  window.ipc.removeAllListeners('agent:stream:content');
  store.clearThinking();
});
</script>
```

### 2.3 文件清单

| 文件路径 | 变更类型 | 说明 |
|---------|---------|------|
| `electron/main/agent/agent-loop.ts` | 修改 | 分离 thinking 和 content 的 IPC 发送 |
| `electron/main/types/ipc.ts` | 修改 | 新增 IPC 事件定义 |
| `src/stores/agentStore.ts` | 新建 | 状态管理：thinking chunks 和 content stream |
| `src/components/agent/ThinkingPanel.vue` | 新建 | 独立 Thinking 面板组件（200+ 行） |
| `src/components/agent/AgentProgressStream.vue` | 修改 | 集成 ThinkingPanel |
| `src/types/agent.ts` | 修改/新建 | 类型定义 |
| `src/utils/thinking-parser.ts` | 新建 | Thinking 内容解析工具 |
| `src/utils/token-estimator.ts` | 新建 | Token 估算工具 |

**预计代码量**：约 500-600 行

---

## 3. 技术细节

### 3.1 流式更新性能优化

**问题**：thinking 内容可能很长，频繁更新会导致性能问题。

**解决方案**：
1. 使用 `requestAnimationFrame` 批量更新 DOM
2. 虚拟滚动（如果 chunks 超过 100 个）
3. 对折叠的 chunk 不渲染内容

```typescript
// 批量更新示例
let pendingDeltas: string[] = [];
let rafId: number | null = null;

function addThinkingDelta(delta: string) {
  pendingDeltas.push(delta);
  
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      const combined = pendingDeltas.join('');
      store.addThinkingDelta({ delta: combined, metadata: {...} });
      pendingDeltas = [];
      rafId = null;
    });
  }
}
```

### 3.2 Thinking 内容解析

**工具调用解析**：
```typescript
function parseToolCall(xml: string): ToolCall | null {
  const nameMatch = xml.match(/<invoke name="(.+?)">/);
  const paramsMatch = xml.match(/<parameter name="(.+?)">([\s\S]*?)<\/antml:parameter>/g);
  
  if (!nameMatch) return null;
  
  const params = paramsMatch?.map(p => {
    const [, name, value] = p.match(/<parameter name="(.+?)">([\s\S]*?)<\/antml:parameter>/) || [];
    return { name, value };
  }) || [];
  
  return {
    toolName: nameMatch[1],
    parameters: params,
  };
}
```

**工具结果解析**：
```typescript
function parseToolResult(xml: string): string {
  const match = xml.match(/<function_results>([\s\S]*?)<\/function_results>/);
  return match ? match[1].trim() : xml;
}
```

### 3.3 Token 统计

简单估算（1 token ≈ 4 字符）：
```typescript
function estimateTokens(text: string): number {
  // 英文：1 token ≈ 4 字符
  // 中文：1 token ≈ 2 字符（需区分）
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}
```

### 3.4 样式系统

使用 CSS 变量支持主题切换：
```scss
:root {
  --thinking-border: #e5e7eb;
  --thinking-bg: #f9fafb;
  --thinking-tool-call: #3b82f6;
  --thinking-tool-result: #10b981;
  --thinking-reasoning: #f59e0b;
}

[data-theme="dark"] {
  --thinking-border: #374151;
  --thinking-bg: #1f2937;
}
```

---

## 4. 测试计划

### 4.1 单元测试

- `thinking-parser.ts` 的解析逻辑
- `token-estimator.ts` 的估算准确性
- `agentStore.ts` 的状态管理

### 4.2 集成测试

- 后端发送分离的 IPC 事件
- 前端正确接收和展示
- 流式更新不丢失数据

### 4.3 E2E 测试

- 完整的对话流程
- 展开/折叠功能
- 搜索和导出功能

### 4.4 性能测试

- 长对话（1000+ thinking chunks）的性能
- 内存占用
- 滚动流畅度

---

## 5. 风险与缓解

### 5.1 风险

1. **API 变化**：Anthropic API 的 thinking delta 格式可能变化
2. **性能问题**：超长 thinking 内容可能导致卡顿
3. **解析失败**：XML 格式不完整或嵌套复杂
4. **兼容性**：现有代码可能依赖旧的流式数据格式

### 5.2 缓解措施

1. 做好 API 版本检测，兼容多种格式
2. 实现虚拟滚动和懒加载
3. 解析失败时降级显示原始文本
4. 分阶段上线，先在实验性功能中测试

---

## 6. 实施计划

### 6.1 阶段划分

**阶段 1：后端改动**（3-4h）
- 修改 `agent-loop.ts` 分离 thinking 和 content
- 新增 IPC 事件定义
- 编写单元测试

**阶段 2：前端状态管理**（2-3h）
- 创建 `agentStore.ts`
- 实现 thinking chunks 管理
- 编写 token 估算和解析工具

**阶段 3：UI 组件开发**（8-10h）
- 开发 `ThinkingPanel.vue`
- 实现展开/折叠、搜索、导出
- 样式优化和响应式布局

**阶段 4：集成与测试**（2-3h）
- 集成到 `AgentProgressStream.vue`
- E2E 测试
- 性能优化

**总计**：15-20 小时

### 6.2 里程碑

- [ ] M1：后端分离 thinking/content 完成
- [ ] M2：前端状态管理完成
- [ ] M3：基础 UI 可用
- [ ] M4：所有功能完成
- [ ] M5：测试通过，准备上线

---

## 7. 未来扩展

1. **更强的解析**：支持嵌套工具调用、复杂 JSON
2. **可视化**：工具调用流程图、时间线视图
3. **协作功能**：分享 thinking 过程给其他用户
4. **AI 辅助**：总结 thinking 内容，提取关键步骤

---

## 8. 决策记录

| 决策点 | 选项 | 最终选择 | 理由 |
|--------|------|----------|------|
| 架构方案 | A/B/C | C（完整重构） | 用户选择，追求最佳体验 |
| 组件拆分 | 集成 vs 独立 | 独立组件 | 易维护、可复用 |
| Token 统计 | 精确 vs 估算 | 估算 | 无需调用 API，性能更好 |
| 虚拟滚动 | 是 vs 否 | 否（初期） | 简化实现，后续优化 |

---

## 附录

### A. API 参考

Anthropic Extended Thinking API 的 delta 格式：
```json
{
  "type": "content_block_delta",
  "delta": {
    "type": "thinking_delta",
    "text": "Let me search for..."
  }
}
```

### B. 相关文档

- [Anthropic Extended Thinking 文档](https://docs.anthropic.com/extended-thinking)
- [Vue 3 性能优化](https://vuejs.org/guide/best-practices/performance.html)
- [Pinia 状态管理](https://pinia.vuejs.org/)

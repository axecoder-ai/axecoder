# 候选方案：AI Thinking 过程输出增强

**任务目标**：AI 回答问题时，在 thinking 过程中输出部分内容（Model Call 和 Tool Result）

**日期**：2025-01-XX  
**状态**：方案设计阶段

---

## 📋 当前实现分析

### 数据流向

```
OpenAI SSE Stream (reasoning_content)
    ↓
Provider Layer (onDelta callback)
    ↓
Agent Loop (agent-loop.ts:99-107)
    ├─ Workshop Mode: 仅流式输出 content
    └─ Agent Mode: content + reasoning 合并流式输出
    ↓
IPC Bridge (agent:progress 频道)
    ↓
Frontend (ChatPane/WorkshopPane)
    ↓
AgentProgressStream 组件展示
```

### 关键发现

**✅ 已实现的能力**：
1. OpenAI SSE 正确解析 `reasoning_content` 字段（`openai-sse.ts:62-64`）
2. Provider 层已支持独立 `reasoning` 通道（`providers/openai.ts:56-58`）
3. 前端组件 `AgentProgressStream.vue` 已有 `streamText` 和 `reasoning-block` 展示区域（102-104 行）
4. 消息类型已支持 `reasoningContent?: string` 字段存储

**⚠️ 存在问题**：
1. **Agent 模式混淆输出**：`agent-loop.ts:102` 将 content 和 reasoning 拼接成单一文本流，无法区分
2. **Workshop 模式丢失 reasoning**：只流式输出 content，reasoning 仅在结束后保存
3. **无结构化展示**：reasoning 作为纯文本展示，缺乏 Model Call/Tool Result 的结构化视图
4. **无独立控制**：用户无法折叠/展开 thinking 面板

---

## 🎯 方案对比

### 方案 A：最小改动 - 分离 Delta 通道（推荐）

**核心思路**：修改 IPC payload 结构，区分 content 和 reasoning 的 delta

**改动点**：
1. **`agent-progress.ts`** - 扩展 payload 类型
   ```typescript
   | {
       sessionId: string
       kind: 'delta'
       deltaType: 'content' | 'reasoning'  // 新增字段
       delta: string
     }
   ```

2. **`agent-loop.ts:99-107`** - 分别发送两种 delta
   ```typescript
   const onDelta = model.provider === 'openai'
     ? (delta: { content?: string; reasoning?: string }) => {
         if (delta.content) {
           emitAgentProgress({ sessionId, kind: 'delta', deltaType: 'content', delta: delta.content })
         }
         if (delta.reasoning) {
           emitAgentProgress({ sessionId, kind: 'delta', deltaType: 'reasoning', delta: delta.reasoning })
         }
       }
     : undefined
   ```

3. **前端组件** - 分别累积和展示
   ```vue
   // ChatPane.vue / WorkshopPane.vue
   const contentStream = ref('')
   const reasoningStream = ref('')
   
   onAgentProgress((payload) => {
     if (payload.kind === 'delta') {
       if (payload.deltaType === 'reasoning') {
         reasoningStream.value += payload.delta
       } else {
         contentStream.value += payload.delta
       }
     }
   })
   ```

4. **`AgentProgressStream.vue`** - 新增独立 thinking 区域
   ```vue
   <div v-if="reasoningStream.trim()" class="thinking-panel">
     <div class="thinking-header" @click="thinkingExpanded = !thinkingExpanded">
       <span>🧠 Thinking</span>
       <span>{{ thinkingExpanded ? '▼' : '▶' }}</span>
     </div>
     <div v-show="thinkingExpanded" class="thinking-content">
       <pre>{{ reasoningStream }}</pre>
     </div>
   </div>
   ```

**优势**：
- ✅ 改动最小（约 50 行代码）
- ✅ 不破坏现有功能
- ✅ 同时支持 Agent 和 Workshop 模式
- ✅ 向后兼容（deltaType 可选）

**劣势**：
- ⚠️ 仍是纯文本展示，无结构化
- ⚠️ 不区分 Model Call 和 Tool Result

**工作量**：2-3 小时

---

### 方案 B：结构化增强 - Thinking Steps 解析

**核心思路**：解析 reasoning 内容为结构化步骤（类似现有的 progress steps）

**改动点**：
1. 继承方案 A 的分离通道
2. **新增 `thinking-parser.ts`** - 解析 reasoning 为步骤
   ```typescript
   type ThinkingStep = {
     id: string
     type: 'analysis' | 'planning' | 'decision'
     content: string
   }
   
   export function parseThinkingDeltas(accumulated: string): ThinkingStep[] {
     // 简单规则：每个段落为一步
     const paragraphs = accumulated.split('\n\n').filter(s => s.trim())
     return paragraphs.map((p, i) => ({
       id: `thinking-${i}`,
       type: inferStepType(p),
       content: p
     }))
   }
   ```

3. **`AgentProgressStream.vue`** - 渲染结构化步骤
   ```vue
   <div class="thinking-steps">
     <div v-for="step in thinkingSteps" :key="step.id" class="thinking-step">
       <span class="step-icon">{{ iconFor(step.type) }}</span>
       <span class="step-content">{{ step.content }}</span>
     </div>
   </div>
   ```

**优势**：
- ✅ 更好的可读性
- ✅ 可扩展（未来可加 token 统计、搜索等）
- ✅ 为后续高级功能打基础

**劣势**：
- ⚠️ 需要解析逻辑（可能不够准确）
- ⚠️ 增加复杂度（约 150 行代码）

**工作量**：5-6 小时

---

### 方案 C：完整重构 - 独立 Thinking Panel

**核心思路**：创建独立 `ThinkingPanel.vue` 组件，支持折叠/展开/搜索/导出

**改动点**：
1. 继承方案 B 的所有能力
2. **新建 `ThinkingPanel.vue`** - 专用 UI 组件
3. **新增 token 统计** - 在 provider 层记录 reasoning tokens
4. **持久化存储** - 将 thinking 历史保存到 SQLite
5. **搜索功能** - 跨会话搜索 thinking 内容

**优势**：
- ✅ 最佳用户体验
- ✅ 完整功能集（统计/搜索/导出）
- ✅ 长期价值高

**劣势**：
- ❌ 改动巨大（约 500+ 行代码）
- ❌ 需要设计评审
- ❌ 测试成本高

**工作量**：15-20 小时

---

## 🏆 推荐方案：A（分离 Delta 通道）

**理由**：
1. **性价比最高**：2-3 小时可完成，立即解决核心问题
2. **风险最低**：不改变现有架构，仅扩展 payload
3. **可迭代**：完成后可逐步升级到方案 B/C

**验收标准**：
- [ ] Agent 模式下，thinking 内容在独立区域实时流式展示
- [ ] Workshop 模式下，reasoning 不再丢失
- [ ] 用户可通过点击折叠/展开 thinking 面板
- [ ] 不影响现有 progress steps 的展示
- [ ] 兼容非 OpenAI 模型（无 reasoning 时不显示面板）

---

## 📝 实施步骤（方案 A）

### 步骤 1：扩展类型定义（10 分钟）
文件：`src/utils/agent-progress.ts`
- 修改 `AgentProgressPayload` 联合类型
- 添加 `deltaType?: 'content' | 'reasoning'` 字段

### 步骤 2：修改后端发送逻辑（20 分钟）
文件：`electron/main/agent/agent-loop.ts`
- 修改 `onDelta` 回调（99-107 行）
- 分别发送 content 和 reasoning 的 delta

### 步骤 3：前端接收和状态管理（30 分钟）
文件：`src/components/workbench/ChatPane.vue`, `WorkshopPane.vue`
- 增加 `reasoningStream` 状态
- 在 `onAgentProgress` 监听器中区分处理

### 步骤 4：UI 组件展示（60 分钟）
文件：`src/components/workbench/AgentProgressStream.vue`
- 添加 `props.reasoningStream: string`
- 新增 `.thinking-panel` 样式区块
- 实现折叠/展开交互

### 步骤 5：测试验证（30 分钟）
- Agent 模式：发送问题，观察 thinking 实时展示
- Workshop 模式：验证 reasoning 不丢失
- 非 OpenAI 模型：确认无 reasoning 时正常工作

---

## 🔍 技术细节补充

### 兼容性处理
```typescript
// agent-progress.ts
export const applyProgressPayload = (
  steps: AgentProgressStep[],
  payload: AgentProgressPayload,
): AgentProgressStep[] => {
  // ...
  if (payload.kind === 'delta') {
    // 向后兼容：无 deltaType 时视为 content
    const type = payload.deltaType ?? 'content'
    // 不修改 steps，仅返回原样（delta 由组件直接消费）
    return next
  }
  // ...
}
```

### 样式参考（Thinking Panel）
```css
.thinking-panel {
  margin-top: 8px;
  border: 1px solid var(--wc-border-light);
  border-radius: 6px;
  overflow: hidden;
}

.thinking-header {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  background: var(--wc-bg-hover);
  cursor: pointer;
  font-size: 11px;
  color: var(--wc-text-dim);
}

.thinking-header:hover {
  background: var(--wc-bg-active);
}

.thinking-content {
  padding: 8px 12px;
  max-height: 300px;
  overflow-y: auto;
  font-size: 11px;
  line-height: 1.5;
  color: var(--wc-text-dim);
  background: var(--wc-bg-subtle);
}

.thinking-content pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
}
```

---

## 📊 风险评估

| 风险项 | 等级 | 缓解措施 |
|--------|------|----------|
| 破坏现有流式输出 | 低 | 保持 deltaType 可选，向后兼容 |
| 前端状态管理混乱 | 低 | 明确分离 contentStream 和 reasoningStream |
| 非 OpenAI 模型异常 | 低 | 条件渲染：仅在有 reasoning 时显示面板 |
| 性能问题（高频 IPC） | 中 | 考虑节流（每 100ms 合并一次 delta） |

---

## 🚀 后续迭代方向

完成方案 A 后，可考虑：

1. **Phase 2**：添加 token 统计（content vs reasoning）
2. **Phase 3**：实现方案 B 的结构化解析
3. **Phase 4**：跨会话 thinking 搜索
4. **Phase 5**：导出 thinking 为 Markdown

---

**下一步**：等待用户选择方案后，进入 `/review-proposals` 阶段

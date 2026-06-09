# 实施计划：AI Thinking 过程输出展示

**功能名称：** AI Thinking 过程输出展示  
**方案文档：** `docs/proposals/proposal-thinking-output.md`  
**方案版本：** 方案 C - 完整重构  
**计划创建时间：** 2025-01-XX  
**预计工作量：** 15-20 小时  
**优先级：** 高  

---

## 1. 目标与范围

### 1.1 目标

实现完整的 AI Thinking 过程展示系统，让用户能够：
1. 实时看到 AI 的思考过程（工具调用、结果、推理）
2. 区分 thinking 内容和最终回答
3. 交互式管理 thinking 内容（展开/折叠、搜索、导出）
4. 了解 token 消耗和工具调用统计

### 1.2 范围

**包含**：
- 后端分离 thinking 和 content 的流式数据
- 前端状态管理（Pinia store）
- 独立 ThinkingPanel 组件
- 结构化解析与展示
- 交互功能（展开/折叠、搜索、复制、导出）
- Token 统计和工具调用统计
- 流式更新性能优化

**不包含**（未来扩展）：
- 可视化流程图
- AI 辅助总结 thinking
- 协作分享功能
- 精确 token 计算（使用估算）

---

## 2. 技术方案概述

### 2.1 架构设计

```
┌─────────────────────────────────────────────────┐
│            Electron Main Process                │
│                                                 │
│  agent-loop.ts                                  │
│    ├─ 检测 content_block_delta.type             │
│    ├─ thinking_delta → IPC: agent:stream:thinking│
│    └─ text_delta → IPC: agent:stream:content    │
└─────────────────────────────────────────────────┘
                      ↓ IPC
┌─────────────────────────────────────────────────┐
│           Renderer Process (Vue)                │
│                                                 │
│  agentStore (Pinia)                             │
│    ├─ thinkingChunks: ThinkingChunk[]           │
│    ├─ contentStream: string                     │
│    └─ actions: add/toggle/clear                 │
│                                                 │
│  ThinkingPanel.vue (新组件)                      │
│    ├─ 头部：统计信息 + 操作按钮                   │
│    ├─ 搜索框（可选显示）                          │
│    └─ Chunks 列表（流式更新）                     │
│                                                 │
│  AgentProgressStream.vue                        │
│    ├─ ThinkingPanel (条件渲染)                   │
│    └─ 回答内容区域                               │
└─────────────────────────────────────────────────┘
```

### 2.2 数据流

```
API Stream
  → agent-loop.ts 检测 delta.type
    → thinking_delta
      → IPC: agent:stream:thinking
        → agentStore.addThinkingDelta()
          → thinkingChunks.push(new chunk)
            → ThinkingPanel 自动更新
    → text_delta
      → IPC: agent:stream:content
        → agentStore.addContentDelta()
          → contentStream += delta
            → 回答区域自动更新
```

---

## 3. 详细任务分解

### 阶段 1：后端改动（3-4h）

#### 任务 1.1：修改 agent-loop.ts（1.5h）
- **文件**：`electron/main/agent/agent-loop.ts`
- **改动点**：
  1. 在流式处理循环中检测 `chunk.delta.type`
  2. 区分 `thinking_delta` 和 `text_delta`
  3. 分别发送到不同的 IPC 通道
  4. 新增 `detectThinkingType()` 辅助函数
- **测试**：
  - 单元测试：验证不同 delta type 的路由逻辑
  - 集成测试：模拟 API stream，确认 IPC 事件正确发送

**伪代码**：
```typescript
for await (const chunk of stream) {
  if (chunk.type === 'content_block_delta') {
    const deltaType = chunk.delta.type;
    
    if (deltaType === 'thinking_delta') {
      win.webContents.send('agent:stream:thinking', {
        delta: chunk.delta.text,
        metadata: {
          timestamp: Date.now(),
          type: detectThinkingType(chunk.delta.text),
        },
      });
    } else if (deltaType === 'text_delta') {
      win.webContents.send('agent:stream:content', {
        delta: chunk.delta.text,
      });
    }
  }
}
```

#### 任务 1.2：更新 IPC 类型定义（0.5h）
- **文件**：`electron/main/types/ipc.ts` 或 `src/types/ipc.ts`
- **改动点**：
  1. 新增 `AgentStreamThinkingPayload` 接口
  2. 新增 `AgentStreamContentPayload` 接口
  3. 更新 `IPC_CHANNELS` 常量
- **测试**：TypeScript 编译通过

#### 任务 1.3：编写工具函数（1h）
- **文件**：`electron/main/agent/thinking-detector.ts`（新建）
- **功能**：`detectThinkingType(text: string)` 检测内容类型
- **逻辑**：
  - 包含 `<function_calls>` → `tool_call`
  - 包含 `<function_results>` → `tool_result`
  - 其他 → `reasoning`
- **测试**：单元测试覆盖各种情况

#### 任务 1.4：单元测试（1h）
- **文件**：`electron/main/agent/__tests__/agent-loop.test.ts`
- **测试用例**：
  1. 收到 thinking_delta 时发送正确的 IPC 事件
  2. 收到 text_delta 时发送正确的 IPC 事件
  3. detectThinkingType 正确分类

---

### 阶段 2：前端状态管理（2-3h）

#### 任务 2.1：创建 agentStore（1.5h）
- **文件**：`src/stores/agentStore.ts`（新建）
- **状态**：
  - `thinkingChunks: ThinkingChunk[]`
  - `contentStream: string`
  - `currentThinkingChunk: ThinkingChunk | null`
- **Actions**：
  - `addThinkingDelta(payload)` - 追加或创建新 chunk
  - `addContentDelta(delta)` - 追加到 contentStream
  - `toggleChunkCollapse(id)` - 切换折叠状态
  - `clearThinking()` - 清空所有 thinking 数据
- **Getters**：
  - `totalTokens` - 总 token 数
  - `toolCallCount` - 工具调用次数
- **测试**：单元测试覆盖所有 actions 和 getters

#### 任务 2.2：创建解析工具（1h）
- **文件**：`src/utils/thinking-parser.ts`（新建）
- **函数**：
  - `parseToolCall(xml: string): ToolCall | null`
  - `parseToolResult(xml: string): string`
  - `formatThinkingContent(chunk: ThinkingChunk): string`
- **测试**：单元测试覆盖各种 XML 格式

#### 任务 2.3：创建 token 估算工具（0.5h）
- **文件**：`src/utils/token-estimator.ts`（新建）
- **函数**：
  - `estimateTokens(text: string): number`
  - 区分中文和英文字符
  - 中文 1 token ≈ 2 字符，英文 1 token ≈ 4 字符
- **测试**：单元测试验证估算准确性

---

### 阶段 3：UI 组件开发（8-10h）

#### 任务 3.1：创建 ThinkingPanel 组件骨架（2h）
- **文件**：`src/components/agent/ThinkingPanel.vue`（新建）
- **结构**：
  1. 头部区域（标题、统计、操作按钮）
  2. 搜索框区域（可选显示）
  3. Chunks 列表区域
- **基础功能**：
  - 连接 agentStore
  - 显示 chunks 数量
  - 基础样式

#### 任务 3.2：实现 Chunk 渲染（2h）
- **功能**：
  1. 遍历 `filteredChunks` 渲染每个 chunk
  2. Chunk 头部：图标、类型标签、时间、token 数
  3. Chunk 内容：根据 type 差异化展示
     - `tool_call`：解析后的工具名和参数
     - `tool_result`：提取的结果内容
     - `reasoning`：纯文本，保留换行
  4. 不同类型的左边框颜色区分
- **测试**：手动测试各种类型的渲染效果

#### 任务 3.3：实现交互功能（2h）
- **功能**：
  1. 点击 Chunk 头部切换折叠/展开
  2. "全部展开"/"全部折叠" 按钮
  3. 复制按钮（复制单个 chunk 内容）
  4. 导出按钮（导出所有 thinking 为 txt）
- **测试**：手动测试所有交互

#### 任务 3.4：实现搜索功能（1.5h）
- **功能**：
  1. 点击搜索图标显示/隐藏搜索框
  2. 输入关键词过滤 chunks
  3. 高亮匹配内容（可选，简化实现可不做）
- **测试**：搜索不同关键词验证过滤逻辑

#### 任务 3.5：样式优化（1.5h）
- **内容**：
  1. 响应式布局（适配不同屏幕宽度）
  2. 主题适配（light/dark mode）
  3. 滚动优化（自动滚动到底部、平滑滚动）
  4. 悬停效果和过渡动画
  5. 移动端适配（如果需要）
- **测试**：切换主题、调整窗口大小验证

#### 任务 3.6：流式更新优化（1h）
- **问题**：频繁更新可能导致性能问题
- **方案**：
  1. 使用 `requestAnimationFrame` 批量更新
  2. 折叠的 chunk 不渲染内容（v-if）
  3. 限制最大 chunks 数量（可选）
- **测试**：模拟长对话验证性能

---

### 阶段 4：集成与测试（2-3h）

#### 任务 4.1：集成到 AgentProgressStream（1h）
- **文件**：`src/components/agent/AgentProgressStream.vue`
- **改动**：
  1. 导入 `ThinkingPanel` 组件
  2. 条件渲染：`v-if="store.thinkingChunks.length > 0"`
  3. 监听 IPC 事件，调用 store actions
  4. 组件卸载时清理监听和状态
- **测试**：集成测试验证完整流程

#### 任务 4.2：E2E 测试（1h）
- **场景**：
  1. 启动对话，验证 thinking 面板出现
  2. 验证不同类型 chunks 正确显示
  3. 验证展开/折叠、搜索、导出功能
  4. 验证统计数据正确
  5. 验证流式更新流畅
- **工具**：Playwright 或手动测试

#### 任务 4.3：性能测试（0.5h）
- **场景**：
  1. 模拟超长对话（1000+ chunks）
  2. 验证内存占用
  3. 验证滚动流畅度
  4. 验证搜索响应速度
- **工具**：Chrome DevTools

#### 任务 4.4：修复 Bug 和优化（0.5h）
- 根据测试结果修复发现的问题
- 优化性能瓶颈

---

## 4. 依赖关系

```
阶段 1（后端）
  ├─ 任务 1.1（agent-loop）
  ├─ 任务 1.2（IPC 类型）
  ├─ 任务 1.3（工具函数）
  └─ 任务 1.4（单元测试）
       ↓
阶段 2（状态管理）
  ├─ 任务 2.1（agentStore）
  ├─ 任务 2.2（解析工具）
  └─ 任务 2.3（token 估算）
       ↓
阶段 3（UI 组件）
  ├─ 任务 3.1（组件骨架）
  │     ↓
  ├─ 任务 3.2（Chunk 渲染）
  │     ↓
  ├─ 任务 3.3（交互功能）
  ├─ 任务 3.4（搜索功能）
  ├─ 任务 3.5（样式优化）
  └─ 任务 3.6（性能优化）
       ↓
阶段 4（集成测试）
  ├─ 任务 4.1（集成）
  ├─ 任务 4.2（E2E）
  ├─ 任务 4.3（性能测试）
  └─ 任务 4.4（修复）
```

**关键路径**：
1.1 → 2.1 → 3.1 → 3.2 → 4.1 → 4.2

---

## 5. 里程碑与交付物

| 里程碑 | 完成标准 | 交付物 | 预计时间 |
|--------|---------|--------|---------|
| M1：后端完成 | IPC 事件正确发送，单测通过 | `agent-loop.ts`, `ipc.ts`, 测试文件 | Day 1 |
| M2：状态管理完成 | Store 正常工作，单测通过 | `agentStore.ts`, 工具函数, 测试文件 | Day 1-2 |
| M3：基础 UI 可用 | ThinkingPanel 能显示基本内容 | `ThinkingPanel.vue` 基础版本 | Day 2 |
| M4：全部功能完成 | 所有交互功能可用，样式完善 | `ThinkingPanel.vue` 完整版本 | Day 3 |
| M5：集成测试通过 | E2E 测试通过，无阻塞 Bug | 集成后的完整功能 | Day 3-4 |

---

## 6. 风险与应对

### 6.1 技术风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| Anthropic API 格式变化 | 中 | 高 | 做版本检测，兼容多种格式，降级显示原始文本 |
| 性能问题（长对话） | 中 | 中 | 实现虚拟滚动、懒加载、限制最大 chunks 数 |
| XML 解析失败 | 高 | 低 | 解析失败时显示原始文本，不影响主流程 |
| IPC 数据丢失 | 低 | 高 | 增加缓冲和重试机制，记录错误日志 |

### 6.2 进度风险

| 风险 | 概率 | 影响 | 应对措施 |
|------|------|------|---------|
| UI 开发超时 | 中 | 中 | 简化初期功能，搜索和导出可延后 |
| 测试发现严重 Bug | 中 | 中 | 预留 buffer 时间，提前开始集成测试 |
| 现有代码兼容问题 | 低 | 高 | 充分调研现有代码，保持向后兼容 |

---

## 7. 测试策略

### 7.1 单元测试（覆盖率 > 80%）

- **后端**：
  - `agent-loop.ts` 的 delta 路由逻辑
  - `detectThinkingType()` 的分类准确性
  
- **前端**：
  - `agentStore` 的所有 actions 和 getters
  - `thinking-parser` 的解析逻辑
  - `token-estimator` 的估算准确性

### 7.2 集成测试

- 后端发送 IPC → 前端接收 → Store 更新 → UI 渲染
- 完整的流式更新流程
- 多次对话的状态管理

### 7.3 E2E 测试

- 启动 Agent 对话
- 验证 ThinkingPanel 显示
- 测试所有交互功能
- 测试边界情况（空内容、超长内容）

### 7.4 性能测试

- 长对话性能（1000+ chunks）
- 内存占用监控
- 滚动和搜索响应时间
- 流式更新帧率

### 7.5 兼容性测试

- macOS / Windows / Linux
- 不同主题（light/dark）
- 不同窗口尺寸

---

## 8. 发布计划

### 8.1 灰度发布

**阶段 1**：内部测试（10% 用户）
- 通过配置开关控制功能可见性
- 收集反馈和性能数据
- 修复发现的问题

**阶段 2**：Beta 测试（50% 用户）
- 扩大测试范围
- 验证性能和稳定性
- 收集用户体验反馈

**阶段 3**：全量发布（100% 用户）
- 确认无严重问题后全量上线
- 持续监控性能指标

### 8.2 回滚方案

如果出现严重问题：
1. 通过配置开关立即关闭功能
2. 回滚代码到上一个稳定版本
3. 分析问题并修复后再次上线

---

## 9. 文档与培训

### 9.1 技术文档

- [ ] API 设计文档（IPC 事件定义）
- [ ] 组件使用文档（ThinkingPanel props 和事件）
- [ ] 状态管理文档（agentStore 使用指南）
- [ ] 故障排查文档（常见问题与解决方案）

### 9.2 用户文档

- [ ] 功能介绍（什么是 Thinking 面板）
- [ ] 使用指南（如何查看、搜索、导出）
- [ ] FAQ（常见问题解答）

### 9.3 开发者指南

- [ ] 如何扩展 thinking 类型
- [ ] 如何自定义渲染逻辑
- [ ] 如何集成到其他组件

---

## 10. 成功标准

### 10.1 功能完整性

- [x] 用户能实时看到 AI 的 thinking 过程
- [x] Thinking 内容与最终回答分离展示
- [x] 支持展开/折叠、搜索、复制、导出
- [x] 显示 token 统计和工具调用统计
- [x] 流式更新流畅，无明显卡顿

### 10.2 质量标准

- [x] 单元测试覆盖率 > 80%
- [x] E2E 测试通过率 100%
- [x] 无 P0/P1 级别 Bug
- [x] 长对话（1000+ chunks）性能可接受（< 100ms 渲染时间）
- [x] 内存占用合理（< 50MB 额外占用）

### 10.3 用户体验

- [x] 界面美观，符合整体设计风格
- [x] 交互流畅，响应及时
- [x] 支持主题切换
- [x] 移动端可用（如果适用）
- [x] 用户满意度 > 80%（通过调查）

---

## 11. 后续优化（未来迭代）

### 11.1 短期优化（1-2 周内）

1. **虚拟滚动**：处理超长对话（5000+ chunks）
2. **高亮搜索结果**：搜索时高亮匹配的文本
3. **快捷键支持**：快速展开/折叠、搜索等

### 11.2 中期优化（1-2 月内）

1. **可视化流程图**：以图形方式展示工具调用链
2. **时间线视图**：按时间顺序展示 thinking 过程
3. **AI 辅助总结**：自动总结 thinking 的关键步骤

### 11.3 长期优化（3-6 月内）

1. **协作分享**：分享 thinking 过程给团队成员
2. **历史记录**：保存和查看历史对话的 thinking
3. **统计分析**：分析 token 消耗趋势、工具使用频率

---

## 12. 关键决策记录

| 决策点 | 选项 | 最终选择 | 理由 | 决策人 | 时间 |
|--------|------|----------|------|--------|------|
| 组件设计 | 集成 vs 独立 | 独立 ThinkingPanel | 易维护、可复用、职责清晰 | 用户 | Day 0 |
| Token 统计 | 精确 vs 估算 | 估算 | 无需调用 API，性能更好，误差可接受 | 用户 | Day 0 |
| 虚拟滚动 | 首期实现 vs 延后 | 延后 | 简化实现，大部分场景不需要 | 开发 | Day 0 |
| 搜索高亮 | 实现 vs 跳过 | 跳过（首期） | 降低复杂度，过滤功能已够用 | 开发 | Day 0 |

---

## 附录

### A. 相关文档

- [方案文档](../proposals/proposal-thinking-output.md)
- [Anthropic Extended Thinking API](https://docs.anthropic.com/extended-thinking)
- [Vue 3 文档](https://vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)

### B. 参考项目

- Cursor 的 thinking 展示实现
- ChatGPT 的推理过程展示
- Claude.ai 的 thinking 模式

### C. 工具和资源

- 测试框架：Vitest / Playwright
- UI 组件库：项目现有组件库
- 性能分析：Chrome DevTools
- 日志监控：Electron 日志系统

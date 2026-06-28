# Session Mode/Model 按会话记忆 — 实施计划

## 当前背景

- `ChatSession` 已有 `chatMode?`，切换时 `applyChatModeFromSession` 会回退 localStorage，与需求不符。
- `modelId` 仅存于全局 `models-store.activeModelId` 与 `WorkshopSession`，Agent chat 未 per-session 记忆。
- Mode 在 persist / 切走时即写入，与「仅发送时写入」不符。

## 需求摘要

见 `docs/requirements/session-mode-model-persistence.md`。

## 设计决策

### 1. 数据模型

- `ChatSession` 增加 `modelId?: string`。
- Workshop 已有 `modelId`，独立 Tab 切换时恢复。

### 2. 纯函数层

`src/utils/session-preferences.ts`：
- 有记录 → 用 session 值；无记录 → 保持当前 UI（不回退 localStorage）。

### 3. Model UI 与全局 store 分离

- 切换 session 恢复 model 时仅改 `modelsFile.activeModelId` 本地 ref，不调用 `setActiveModel`。
- 用户主动选模型仍走 `setActiveModel` 更新全局默认。
- `newChat` 用 `globalDefaultModelId`（`loadModels` 时从磁盘记录）。

## 实施计划

### 阶段一：工具与类型

1. 新增 `session-preferences.ts` + 单测
2. 扩展 `ChatSession` 类型（main + d.ts）

### 阶段二：ChatPane

1. `applySessionPreferencesOnSwitch(session)`
2. `persist` / `persistForChat` 内 `stampSessionPreferences`
3. 移除切走时的 `syncChatModeToSession`
4. `newChat` 使用 `newSessionPreferences`
5. 嵌入 Workshop：`selectSession` 后 `openForAgentChat`

### 阶段三：WorkshopChatSection

1. `selectSession` 恢复 `modelId`（有则用，无则保持）
2. 发送保存时确保 `modelId` 写入

### 阶段四：测试与文档

1. 跑 `UT-session-preferences`、`UT-chat-modes-ui` 及相关套件
2. 落盘 implement / review 报告

## 文件变更清单

| 文件 | 操作 |
|------|------|
| `src/utils/session-preferences.ts` | 新增 |
| `tests/unittest/UT-session-preferences/session-preferences.test.ts` | 新增 |
| `electron/main/chat-store.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/ChatPane.vue` | 修改 |
| `src/components/workbench/WorkshopChatSection.vue` | 修改 |
| `tests/unittest/UT-chat-modes-ui/chat-modes-ui.test.ts` | 修改 |

## 测试策略

- 单测：resolve/stamp/newSession 边界
- 回归：chat-modes 迁移逻辑不变

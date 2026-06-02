# Session 主题自动命名 — 实施计划

## 当前背景

- `ChatPane` 仅在首条发送时将 `New Agent` 替换为首句 24 字截断。
- 多轮后侧栏仍显示「你好」等，无法体现主题。
- 统一列表读 `sessions/index.json` 的 `title` 字段。

## 需求

### 功能需求

- 首条仍快速截断占位。
- `messages.length >= 4` 且 title 为占位时，Main 用 fast API 生成 6–16 字中文主题。
- 更新 session 文件与 registry；侧栏刷新。
- 非占位 title 不覆盖；本期无手动重命名 UI。

### 非功能需求

- 异步、不阻塞发送；失败静默。
- 每会话至多成功刷新一次（占位→主题后不再调用）。

## 设计决策

### 1. 触发与 API

- 混合方案：Renderer `persist` 后 fire-and-forget `session:suggestTitle`。
- `resolveApiModelIdForTask(model, 'subagent', '')` 走 fast 档。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/session/session-title.ts` | 新增 |
| `electron/main/session/session-ipc.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/ChatPane.vue` | 修改 |
| `tests/unittest/UT-session-auto-title/session-title.test.ts` | 新增 |

## 实施计划

1. 单测：`isPlaceholder` / `shouldSuggest` / `parseSuggestedTitle`
2. 实现 `suggestChatSessionTitle` + IPC
3. `ChatPane` 挂钩与列表刷新
4. 全量 `npm test`

## 测试策略

- Vitest 纯函数 + mock `chatWithProvider`
- 手工：问候后深入讨论，title 变模块/方案类主题

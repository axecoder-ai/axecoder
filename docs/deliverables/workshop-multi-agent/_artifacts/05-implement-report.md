# 功能实现报告

## 功能说明

- 聊天底栏选择 **Multi-Agent** 时自动进入 Collab Workshop（`workshop` 标签 + `workshop:*` IPC）。
- 切回 Agent 等模式或 Agent 标签时恢复上一非 Multi-Agent 模式。
- 侧栏按钮、会话类型标签、默认会话标题、占位符统一为 **Multi-Agent**（内部仍 `SessionKind=workshop`、`chatModeId=multi-agent`）。
- 后端 `multi-agent` 不再为 Agent 会话暴露 `Agent` 子代理工具；system addon 指向 Workshop UI。

## 修改文件

| 路径 | 说明 |
|------|------|
| `src/components/workbench/ChatPane.vue` | 模式↔标签双向同步 |
| `src/utils/chat-modes.ts` | Multi-Agent 描述 |
| `electron/main/agent/chat-mode.ts` | 去掉 Agent 工具揭示 |
| `src/components/workbench/AgentsPanel.vue` | 按钮/列表文案 |
| `src/components/workbench/WorkshopChatSection.vue` | 默认标题与 placeholder |
| `src/components/workbench/TitleBar.vue` | tooltip |
| `tests/unittest/UT-chat-mode-workshop/*` | 单测 |

## 注意事项

- Workshop composer 仍独立；未做提案 2 单输入框合并。
- 全量 `npm test` 存在与本次无关的历史失败（17 项）；本轮新增 2 项全绿。

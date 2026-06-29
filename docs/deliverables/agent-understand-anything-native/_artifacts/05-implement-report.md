# 功能实现报告

## 功能说明

1. **Understand 独立 Chat 模式**：与 Draw.IO / Software Co. 同级，Workshop 左聊右图。
2. **主进程读图谱层**：`electron/main/understand-anything/manager.ts` 加载 `.understand-anything/knowledge-graph.json`，Fuse 搜索，构建 LLM context。
3. **Agent 工具**：UnderstandSearch / UnderstandContext / UnderstandExplain / UnderstandDiff。
4. **Dashboard WebView**：本地 HTTP 服务 + `UnderstandDashboardEmbed.vue` webview。
5. **内置 Skill**：`resources/builtin-skills/understand/SKILL.md` 指向完整 UA 流水线。
6. **Feature flag**：`agentFeatureUnderstandAnything` 默认 true。

## 修改文件（主要）

| 路径 | 说明 |
|------|------|
| `electron/main/understand-anything/*` | 图谱 manager、dashboard 静态页、turn 编排 |
| `electron/main/understand-anything-ipc.ts` | IPC status |
| `electron/main/agent/agent-understand-anything*.ts` | Agent 工具 |
| `electron/main/agent/chat-mode.ts` | understand 模式与工具白名单 |
| `electron/main/workshop-ipc.ts` | understand turn 路由 |
| `src/utils/chat-modes.ts` | UI 模式选项 |
| `src/components/workbench/*` | ChatPane、WorkshopChatSection、UnderstandDashboardEmbed |
| `resources/builtin-skills/understand/` | /understand 入口 |
| `package.json` | fuse.js 依赖 |

## 注意事项

- 首版**不**自动跑 `/understand` 多代理流水线；用户需 Skill 生成 JSON。
- Dashboard 为内置轻量静态页；完整 UA React Dashboard 可二期替换 dist。
- 与 CodeGraph **并存**：Agent 用 CodeGraph，Understand 模式用 UA 工具。

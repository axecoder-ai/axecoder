# 调研链接

- `docs/examples/ai-performance-dashboard.html` — 用户确认的 HTML 示例效果
- `docs/deliverables/workbench-split-dual-pane/` — 伴生窗（`#companion`）脱离/合并模式参考
- `electron/main/index.ts` — `companionWin` 创建与 IPC
- `src/utils/workbench-window-role.ts` — 窗口角色解析
- `electron/main/ai/chat-with-provider.ts`、`ai-ipc.ts` — AI 调用入口（埋点位置）
- `electron/main/agent/agent-loop.ts` — Agent 多轮模型调用
- `src/components/workbench/TitleBar.vue` — 标题栏按钮入口
- `src/App.vue` — 主/伴生布局分支

**调研缺口：** 当前无 AI 性能指标采集模块，需新建主进程 metrics store 与前端图表组件。

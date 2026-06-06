# 功能实现报告

## 功能说明

- TitleBar 新增「双窗分屏」按钮：打开独立**会话伴生窗**（`#companion`），主窗隐藏右侧 AI 列，避免重复。
- 伴生窗全宽展示 `AgentsPanel` + `ChatPane`，优先定位到副显示器 `workArea`。
- Agent / Workshop 流式进度通过 `broadcastToRenderers` 同步到所有窗口。
- 再次点击或关闭伴生窗后，主窗恢复右侧 AI 面板。

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `electron/main/index.ts` | 伴生窗 CRUD、IPC、退出时关闭 |
| `electron/main/renderer-broadcast.ts` | 新增多窗广播 |
| `electron/main/agent/agent-progress-emit.ts` | 进度广播 |
| `electron/main/workshop/workshop-progress-emit.ts` | 进度广播 |
| `electron/main/agent-ipc.ts` | 移除已废弃 bind |
| `electron/main/workshop-ipc.ts` | 移除已废弃 bind |
| `electron/preload/index.ts` | 暴露 window 伴生 API |
| `src/types/axecoder.d.ts` | 类型 |
| `src/utils/workbench-window-role.ts` | hash 角色解析 |
| `src/App.vue` | 主/伴生布局分支 |
| `src/components/workbench/TitleBar.vue` | 双窗按钮与伴生标题栏 |
| `shared/i18n/locales/en.ts`, `zh-CN.ts` | 文案 |
| `tests/unittest/UT-workbench-split-dual-pane/*` | 单测 |

## 单测覆盖

- `parseWorkbenchRoleFromHash` / `parseWorkbenchRoleFromLocation`：companion 与 main 分支。

## 注意事项

- 伴生窗与主窗各挂载一套 ChatPane，会话数据经主进程 store/IPC 共享。
- 终端、状态栏、设置入口仅主窗保留；伴生窗 TitleBar 精简。
- 手工验证：双显示器拖放、会话切换、Agent 流式进度两窗可见。

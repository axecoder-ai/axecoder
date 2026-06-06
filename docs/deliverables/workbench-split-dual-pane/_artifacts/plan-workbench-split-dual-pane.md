# 工作台双窗分屏 设计文档

## 当前背景

- `App.vue` 横向布局：侧栏 | 编辑 | AI 侧栏（Chat + Agents）
- `electron/main/index.ts` 仅有单主窗；`open-win` 未接入 preload
- Agent/Workshop 进度仅发往主窗

## 需求

### 功能需求

- TitleBar 一键打开/关闭「会话伴生窗」
- 主窗：资源管理器 + 编辑器（伴生窗打开时隐藏右侧 AI 列）
- 伴生窗：会话列表 + 聊天全宽
- 伴生窗优先出现在副显示器 workArea
- 关闭伴生窗后主窗恢复 AI 列

### 非功能需求

- 进度事件双窗同步
- 退出应用时关闭伴生窗

## 设计决策

### 1. 窗口角色识别

- 主进程 `window:getRole` 按 `webContents` 判断 `main` | `companion`
- 伴生窗 URL：`#companion`

### 2. 状态同步

- IPC `window:companionState` 通知主窗 `companionOpen`
- 不复制会话 store；两窗各挂载 ChatPane，读写同一 IPC

## 实施计划

1. **主进程**：伴生窗 CRUD、副屏定位、进度广播
2. **preload + 类型**：暴露 API
3. **前端**：`App.vue` 角色布局、`TitleBar` 按钮、i18n
4. **单测**：`workbench-window-role.ts`
5. **手工**：双屏拖窗、会话切换

## 测试策略

- Vitest：`parseWorkbenchRoleFromLocation`
- 手工：开伴生窗、关伴生窗、agent 流式输出

## 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/renderer-broadcast.ts` | 新增 |
| `electron/main/index.ts` | 修改 |
| `electron/main/agent/agent-progress-emit.ts` | 修改 |
| `electron/main/workshop/workshop-progress-emit.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/utils/workbench-window-role.ts` | 新增 |
| `src/App.vue` | 修改 |
| `src/components/workbench/TitleBar.vue` | 修改 |
| `shared/i18n/locales/en.ts`, `zh-CN.ts` | 修改 |
| `tests/unittest/UT-workbench-split-dual-pane/*.test.ts` | 新增 |

# Agent 权限管理 UI 实施计划

## 当前背景

- 后端 `agent-permissions.ts` 仅支持 mode + 工具名数组，无 subject 规则、无项目级配置。
- Settings 无 Permissions 页；用户只能改 JSON 或依赖 `agentAutoApplyWrites`。

## 需求

### 功能需求
- Settings Permissions 页：模式、deny/ask/allow 规则列表、全局/项目 JSON 编辑。
- 全局 `~/.axecoder/config.json`；项目 `.axecoder/permissions.json`。
- `/permissions` 打开设置页。
- Agent 执行时合并策略，`Bash(command)` 等可匹配。

### 非功能需求
- 兼容旧 `agentAllowedTools`/`agentDisallowedTools`。
- 规则解析纯函数、可单测。

## 设计决策

### 1. 规则引擎
采用 Reasonix 优先级：deny > ask > allow > 只读工具 allow > mode fallback。

### 2. 配置分层
全局 config.json + 项目 permissions.json；合并时列表取并集，项目 mode 非空时覆盖全局 mode。

## 实施计划

1. **阶段一：规则引擎与存储**
   - `agent-permission-rules.ts`、`project-permissions-store.ts`
   - 重构 `agent-permissions.ts`；`agent-loop.ts` 传入 subject

2. **阶段二：IPC 与类型**
   - `permissions-ipc.ts`、preload、`models-types`、config-store

3. **阶段三：前端 UI**
   - `PermissionsTab.vue`、Settings 导航、i18n、`/permissions`

4. **阶段四：测试与文档**
   - `UT-agent-permissions-ui` 单测；实现/审查报告

## 测试策略

- 规则解析：`Bash(rm*)`、`Bash=git push`
- 合并：全局 deny + 项目 allow
- 回归：`UT-agent-runtime-gaps` 现有用例

## 文件变更

| 文件 | 类型 |
|------|------|
| `electron/main/agent/agent-permission-rules.ts` | 新增 |
| `electron/main/project-permissions-store.ts` | 新增 |
| `electron/main/permissions-ipc.ts` | 新增 |
| `electron/main/agent/agent-permissions.ts` | 修改 |
| `electron/main/agent/agent-loop.ts` | 修改 |
| `electron/main/models-types.ts` | 修改 |
| `electron/main/config-store.ts` | 修改 |
| `electron/main/index.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/components/workbench/PermissionsTab.vue` | 新增 |
| `src/components/workbench/SettingsPanel.vue` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/App.vue` | 修改 |
| `src/slash-commands/builtin.ts` | 修改 |
| `src/slash-commands/types.ts` | 修改 |
| `shared/i18n/locales/{en,zh-CN}.ts` | 修改 |
| `tests/unittest/UT-agent-permissions-ui/*.test.ts` | 新增 |

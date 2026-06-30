# subagent-complete 设计文档

## 当前背景

`agent-subagent-parity` 已落地 Task 工具与 11 种内置专型；遗留 `.cursor/agents` 未加载、Settings Subagents 占位。

## 需求

### 功能需求
- 发现 user/project `.cursor/agents/*.md`（Cursor frontmatter 格式）
- `Task(subagent_type)` 解析自定义代理并注入 prompt
- 自定义同名覆盖内置专型
- Settings：列表 + 新建/编辑/删除（builtin 只读展示）
- IPC：`subagents:list/read/save/delete`

### 非功能需求
- 复用 skills 安全路径校验模式
- 单测覆盖发现、解析、执行配置

## 实施计划

1. **阶段一：存储与解析**
   - `subagents-types.ts`、`subagents-parse.ts`、`subagents-store.ts`
   - `agent-custom-subagents.ts` + `resolveSubagentForExecution`

2. **阶段二：运行时**
   - 改 `agent-subagent.ts`、`tool-executor.ts` Task 分支
   - 改 Task schema、system prompt 委派段

3. **阶段三：UI + IPC**
   - `subagents-ipc.ts`、preload、types
   - `SubagentFormDialog.vue`、`RulesSkillsTab.vue`

4. **阶段四：测试**
   - `UT-subagent-complete` + 回归 `npm test`

## 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/subagents/*` | 新增 |
| `electron/main/agent/agent-custom-subagents.ts` | 新增 |
| `electron/main/agent/agent-subagent-types.ts` | 修改 |
| `electron/main/agent/agent-subagent.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `electron/main/agent/agent-tool-prompts.ts` | 修改 |
| `electron/main/agent/agent-system-prompt.ts` | 修改 |
| `electron/main/index.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/components/workbench/SubagentFormDialog.vue` | 新增 |
| `src/components/workbench/RulesSkillsTab.vue` | 修改 |
| `tests/unittest/UT-subagent-complete/` | 新增 |

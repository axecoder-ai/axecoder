# Agent 探索编排（Chat · Claude 对齐）设计文档

## 当前背景

- AxeCoder Chat Agent 已有 Read/Grep/Agent(explore)/TodoWrite/FRC，但 Todo 不回灌、§7 缺委派指引，FRC 清理后易重复 Read。
- Claude Code 通过 `todo_reminder` attachment、`getSessionSpecificGuidanceSection` 的 Explore 阈值、scratchpad 与 FRC 说明降低步数。

## 需求

### 功能需求

- P0：Chat 每轮模型调用前注入当前 Todo 列表（有则注入，格式对齐 Claude `todo_reminder`）。
- P0：system prompt 增加 Todo 管理、Agent(Explore) 委派（>3 次搜索用 explore）、勿重复子代理搜索。
- P0：system prompt 增加 scratchpad 目录说明与 FRC「保留最近 N 条」说明。
- P1：`Agent(subagent_type=explore)` 成功后将 report 写入 `scratchpad/explore-summary.md`；下轮注入摘要。
- P1：TodoWrite 工具返回文案对齐 Claude（提醒继续使用 todo）。

### 非功能需求

- 仅 `electron/main/agent/*` + 单测；不改 Workshop、不改 `src/` UI。
- 注入总长度可控（todo ≤20 条，scratchpad 摘要 ≤4KB）。

## 设计决策

### 1. 软编排 vs 状态机

选 **软编排**，对齐 Claude `prompts.ts`，不在 `StoredAgentSession` 增加 phase。

### 2. 注入位置

选 **`prepareSessionBeforeModel`** 末尾追加 `user` + `<system-reminder>`（与现有 Context budget 一致），每轮先 `stripBudgetReminders` 再注入，避免重复堆叠。

### 3. Explore 摘要

选 **scratchpad 文件** `explore-summary.md`，由 `tool-executor` 在 explore 子代理成功后写入。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `agent-context-inject.ts` | 新增 |
| `agent-system-prompt.ts` | 修改 |
| `agent-loop.ts` | 修改 |
| `agent-ext-executor.ts` | 修改 |
| `agent-scratchpad.ts` | 增加 read helper |
| `tool-executor.ts` | explore 写 scratchpad |
| `tests/unittest/UT-agent-explore-orchestration/*.test.ts` | 新增 |

## 实施计划

1. 单测：注入函数、prompt 段含关键字。
2. 实现 `agent-context-inject.ts` + system prompt 段。
3. 接入 `prepareSessionBeforeModel`。
4. TodoWrite 文案 + explore scratchpad 写入。
5. `npm test` 全绿。

## 测试策略

- `UT-agent-explore-orchestration`：纯函数单测，不调真实 API。

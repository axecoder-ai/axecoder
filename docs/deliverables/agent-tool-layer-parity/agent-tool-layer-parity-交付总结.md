# agent-tool-layer-parity 交付总结

| 字段 | 值 |
|------|-----|
| 任务名 | agent-tool-layer-parity |
| 完成日期 | 2026-06-01 |
| 选定方案 | 提案 2 – 全量 1:1 + Wave4 最小可调用 |
| 审查结论 | 通过 |
| 单测 | 159/159 全绿 |

---

## 1. 概述

**需求：** 实现 `research-axecoder-vs-参考实现.md` §2 工具层全部缺口。

**目标：** Agent 注册 36 个工具、扩展 executor、Plan 模式、并行 tool、子代理类型/后台、Bash git 安全。

**选型：** 用户选定提案 2，并要求 Wave4（WebSearch/LSP/Worktree 等）最小可调用而非仅文档。

**交付物目录：** `docs/deliverables/agent-tool-layer-parity/`，过程稿 `_artifacts/`。

---

## 2. 方案

已确认：统一 `buildFullAgentTools()` + `agent-ext-executor` 分发；`agent-loop` 维护 `activeTools` / `planMode`；Wave4 通过 `config.json` 的 `agentFeature*` 启用。

详见 `_artifacts/proposal-agent-tool-layer-parity.md`。

---

## 3. 方案选型过程

| 维度 | 提案 1 分波 | 提案 2 全量（选定） |
|------|-------------|---------------------|
| 范围 | Wave 1–3 本轮 | 一次注册全部工具 |
| Wave4 | 可延后 | 用户要求 stub+开关 |

**调整：** Wave4 最小可调用实现。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：类型/Registry → Executor 模块 → Loop/子代理 → 单测。

详见 `_artifacts/plan-agent-tool-layer-parity.md`。

---

## 5. 实现说明

- **36 工具** 已加入 `AGENT_TOOLS`（`agent-tool-registry.ts`）。
- **运行时** 在 `agent-ext-executor.ts`；核心文件工具仍在 `tool-executor.ts`。
- **并行** `agent-loop.ts` 使用 `Promise.all` 执行同轮 tool calls。
- **子代理** `subagent_type`: explore/plan/generalPurpose；`run_in_background` + TaskOutput/Stop。

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

- 命令：`npm test`
- 结果：**33 文件、159 用例全通过**

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

| 场景 | 结果 |
|------|------|
| 工具注册 36 个 | UT-agent-tool-level-prompts |
| TodoWrite / PlanMode / explore 过滤 | UT-agent-tool-layer-parity |
| 危险 git 命令 | UT-agent-tool-layer-parity |
| 回归 | 全量 vitest 绿 |

手工/E2E：待在 IDE 内用 OpenAI/Anthropic 模型验证 MCP/WebSearch 配置路径。

---

## 8. 代码审查

**结论：通过。** MCP/WebSearch/LSP 为 stub，见非阻塞待办。

详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-types.ts` | 修改 | 扩展工具名 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | 新增 | 26 扩展工具 schema |
| `electron/main/agent/agent-tool-registry.ts` | 新增 | 全量组装 |
| `electron/main/agent/agent-ext-executor.ts` | 新增 | 扩展运行时 |
| `electron/main/agent/agent-todo-store.ts` | 新增 | Todo/Task |
| `electron/main/agent/agent-subagent-tasks.ts` | 新增 | 后台任务 |
| `electron/main/agent/agent-skills.ts` | 新增 | Skills |
| `electron/main/agent/agent-mcp.ts` | 新增 | MCP stub |
| `electron/main/agent/agent-web.ts` | 新增 | Web |
| `electron/main/agent/agent-notebook.ts` | 新增 | Notebook |
| `electron/main/agent/agent-tool-defs.ts` | 修改 | AGENT_TOOLS 全量 |
| `electron/main/agent/tool-executor.ts` | 修改 | Plan/Agent/分发 |
| `electron/main/agent/agent-loop.ts` | 修改 | 并行/activeTools |
| `electron/main/agent/agent-session-store.ts` | 修改 | 会话字段 |
| `electron/main/agent/agent-subagent.ts` | 修改 | 类型/并行 |
| `electron/main/agent/agent-bash.ts` | 修改 | Git 安全 |
| `electron/main/models-types.ts` | 修改 | feature flags |
| `electron/main/config-store.ts` | 修改 | 配置合并 |
| `tests/unittest/UT-agent-tool-layer-parity/*` | 新增 | 单测 |

---

## 10. 遗留项与后续建议

1. 真实 MCP SDK 与 WebSearch API。
2. `getMcpInstructions` 动态系统提示段。
3. 自定义 agents 目录、权限引擎、斜杠 `/mcp`（另项）。
4. Renderer Todo/子代理 UI。

---

## 11. 附录：过程文档索引

| 文件 | 路径 |
|------|------|
| 调研链接 | `_artifacts/00-research-links.md` |
| 选型 | `_artifacts/02-selection.md` |
| 提案 | `_artifacts/proposal-agent-tool-layer-parity.md` |
| 计划 | `_artifacts/plan-agent-tool-layer-parity.md` |
| 实现报告 | `_artifacts/05-implement-report.md` |
| 单测 | `_artifacts/05-unittest.md` |
| 审查 | `_artifacts/06-code-review.md` |

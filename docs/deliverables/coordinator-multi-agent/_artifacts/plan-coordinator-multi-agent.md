# Coordinator 多 Agent 统一引擎 设计文档

**desired_location:** `docs/plans/plan-coordinator-multi-agent.md`

## 当前背景

- Workshop Multi-Agent 已有 turn 编排（`workshop-turn-orchestrator.ts` + `workshop-router.ts`），但逻辑绑在 workshop 包内。
- Agent 模式仅有 `Task` 单个子代理委派，矩阵「Coordinator 多 Agent」标为「部分 Workshop」。
- `multi-agent` chatMode 仍向 Agent 会话暴露 Task/Agent，与 Workshop UX 冲突。

## 需求

### 功能需求

1. 抽取通用 `coordinator-turn-engine`，Workshop 通过 re-export 调用，行为不变。
2. Agent 新增 `Coordinator` 工具：接收子任务列表，并行/串行调用 `runSubAgentTask`，返回汇总 JSON。
3. `multi-agent` 模式不再 revelation Task/Agent；系统提示明确走 Workshop。
4. 矩阵 AxeCoder「Coordinator 多 Agent」→ **已实现**。

### 非功能需求

- 既有 workshop 单测不回归。
- 子代理不可调用 Coordinator（与 Task 同级限制）。

## 设计决策

### 1. 引擎位置

将 `workshop-turn-orchestrator.ts` 整体迁入 `coordinator/coordinator-turn-engine.ts`；workshop 文件仅 re-export，避免双份逻辑。

### 2. Agent Coordinator

独立 `coordinator-agent.ts`，复用 `runSubAgentTask`，不重复 agent-loop。参数：`tasks[]`、`parallel`（默认 true）。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/coordinator/coordinator-turn-engine.ts` | 新增（自 workshop 上移） |
| `electron/main/coordinator/coordinator-agent.ts` | 新增 |
| `electron/main/coordinator/index.ts` | 新增 |
| `electron/main/workshop/workshop-turn-orchestrator.ts` | 改为 re-export |
| `electron/main/agent/tool-executor.ts` | Coordinator 分支 |
| `electron/main/agent/agent-types.ts` | 类型 + 子代理禁用 |
| `electron/main/agent/agent-tool-prompts-ext.ts` | schema |
| `electron/main/agent/agent-tool-registry.ts` | SUB_AGENT_DISALLOWED |
| `electron/main/agent/chat-mode.ts` | multi-agent 修正 |
| `tests/unittest/UT-coordinator-multi-agent/*` | 新增 |
| `docs/research/research-agent-tools-matrix.md` | 矩阵更新 |

## 实施计划

1. **阶段一：** 创建 coordinator 包，迁移 turn engine，workshop re-export。
2. **阶段二：** 实现 Coordinator 工具 + agent 注册 + chat-mode 修正。
3. **阶段三：** 单测 + 矩阵文档 + 交付物。

## 测试策略

- 跑 `UT-collab-workshop/workshop-turn-orchestrator.test.ts`。
- 新增 Coordinator agent 单测（mock runSubAgentTask）。

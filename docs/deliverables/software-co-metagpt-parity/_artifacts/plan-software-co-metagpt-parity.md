# Software Co. MetaGPT 完整对齐 — 实施计划

**状态：** 待实施  
**关联提案：** `docs/proposals/proposal-software-co-metagpt-parity.md`  
**slug：** `software-co-metagpt-parity`

## 当前背景

- 已有 `metagpt-alignment` 交付：SOP 阶段机、Message Pool、QA 环、`software-company` ChatMode。
- 实测差距：implement 未逐 task；QA 缺自动 shell；Pool 截断；无角色工具剖面；固定阶段链。

## 需求

### 功能需求

1. 逐 task 实现（`sop-task-runner`）+ implement 内可执行反馈
2. 自动探测并 shell 跑测（`sop-test-runner`）
3. Message Pool artifact 路径 + Read 提示，放宽截断
4. Action 依赖图驱动阶段推进（`sop-action-graph`）
5. 角色工具剖面（`sop-role-tools`）
6. `project_manager` 内置角色负责 WriteTasks
7. Design schema 扩展 `sequenceDiagram`
8. 意图分流（绿场 vs 增量）
9. implement 阶段 workshop session 复用
10. UI task 级进度

### 非功能需求

- Agent / Multi-Agent / Reflection 零回归
- 单测全绿

## 设计决策

### 1. 编排

用 `sop-action-graph` 表达 Action 依赖；`runPipelineFromPhase` 保留入口，implement 内调 `runTasksImplementLoop`。

### 2. 测试

`sop-test-runner` 探测 `package.json` / `Makefile` / `go.mod`；QA 与每 task 反馈默认 shell（可注入 mock）。

## 实施计划

1. **阶段一：基础模块** — intent、test-runner、task-runner、action-graph、role-tools + 单测
2. **阶段二：集成** — sop-types、builtin 角色、pipeline-engine、message-pool、prompts、gates、design schema
3. **阶段三：Workshop** — agent-loop session 复用、workshop-agent-speaker、workshop-types、UI 进度
4. **阶段四：回归** — 扩展现有 UT-sop-*，跑全量 vitest

## 测试策略

- `UT-sop-task-runner`、`UT-sop-test-runner`、`UT-sop-action-graph`
- 扩展 `UT-sop-pipeline` 多 task scripted 路径
- `UT-collab-workshop`、`UT-chat-mode-*` 回归

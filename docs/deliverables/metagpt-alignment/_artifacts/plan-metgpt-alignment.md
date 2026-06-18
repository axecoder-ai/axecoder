# MetaGPT 对齐 — 实施计划

**状态：** 待实施  
**关联提案：** `docs/proposals/proposal-metgpt-alignment.md`  
**slug：** `metagpt-alignment`

## 当前背景

- AxeCoder 已有 7 个内置工作流角色、`coordinator-turn-engine`（AI 动态路由）、rppit 流水线（Agent 单会话）。
- 缺 MetaGPT 式固定 SOP、Message Pool（causeBy/watch）、结构化 PRD/Design/Tasks、QA 自动回流。

## 需求

### 功能需求（P0）

1. 新 ChatMode `software-company`：一行需求驱动 SOP 流水线。
2. 阶段顺序：`requirement → prd → design → tasks → implement → qa → done`。
3. 每阶段产出 artifact 落盘 `docs/deliverables/{slug}/_artifacts/`。
4. Message Pool：publish/subscribe + `causeBy` 元数据。
5. QA 闭环：跑测失败回流 Developer（最多 3 轮）。
6. Workshop UI 阶段进度条；与 Multi-Agent / Reflection 互斥规则一致。

### 非功能需求

- 单测覆盖 pipeline、message-pool、qa-loop；不破坏现有 Workshop 单测。
- 原子写 artifact；`projectRoot` 校验与 workshop-store 一致。

## 设计决策

### 1. 编排引擎

新增 `sop-pipeline-engine.ts`，与 `coordinator-turn-engine.ts` **并列**；`workshop-ipc` 按 `orchestrationChatMode` 分支。

### 2. Message Pool

进程内 `MessagePool` 类，序列化进 `WorkshopSession.sopPoolMessages`（可选字段）便于恢复。

### 3. 角色映射

| SOP 阶段 | builtinRole | causeBy |
|----------|-------------|---------|
| prd | product_analyst | WritePRD |
| design | architect | WriteDesign |
| tasks | planner | WriteTasks |
| implement | developer | WriteCode |
| qa | qa_engineer | RunQA |
| done | manager | DeliverSummary |

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/sop/sop-types.ts` | 新建 |
| `electron/main/sop/schemas/*.ts` | 新建 |
| `electron/main/sop/message-pool.ts` | 新建 |
| `electron/main/sop/sop-gates.ts` | 新建 |
| `electron/main/sop/sop-pipeline-engine.ts` | 新建 |
| `electron/main/sop/qa-loop.ts` | 新建 |
| `electron/main/sop/rppit-phase-map.ts` | 新建 |
| `electron/main/sop/index.ts` | 新建 |
| `electron/main/workshop/workshop-types.ts` | 扩展字段 |
| `electron/main/builtin-workflow-roles.ts` | qa_engineer |
| `electron/main/users-types.ts` | qa_engineer |
| `electron/main/workshop-ipc.ts` | SOP 分支 |
| `electron/main/agent/chat-mode.ts` | software-company |
| `src/utils/chat-modes.ts` | UI 选项 |
| `src/types/axecoder.d.ts` | 类型同步 |
| `src/components/workbench/WorkshopSopProgress.vue` | 新建 |
| `src/components/workbench/WorkshopChatSection.vue` | 嵌入阶段条 |
| `electron/main/agent/rppit-axecoder-addon.ts` | phase 映射说明 |
| `tests/unittest/UT-sop-pipeline/` | 新建 |
| `tests/unittest/UT-sop-message-pool/` | 新建 |
| `tests/unittest/UT-sop-qa-loop/` | 新建 |

## 实施计划

### 阶段一：SOP 核心类型与 Message Pool（2d）

- sop-types、schemas、message-pool、单测 UT-sop-message-pool

### 阶段二：Pipeline 引擎与闸门（3d）

- sop-gates、sop-pipeline-engine、scripted speaker、UT-sop-pipeline

### 阶段三：QA 环与角色扩展（2d）

- qa-loop、qa_engineer 内置角色、UT-sop-qa-loop

### 阶段四：IPC / ChatMode / UI（2d）

- workshop-ipc 分支、chat-modes、WorkshopSopProgress

### 阶段五：rppit 映射与回归（1d）

- rppit-phase-map、更新 chat-mode-lock 单测、全量 vitest

## 测试策略

- **单元测试：** message pool 订阅隔离；pipeline 阶段顺序；gate 拒绝空 PRD；qa-loop 3 轮回流。
- **回归：** UT-collab-workshop、UT-coordinator-multi-agent、UT-chat-mode-lock。

## 已知限制

- 自定义 SOP 编辑器不在本期。
- QA 跑测依赖项目已有 test 命令（vitest/go test 等），无统一探测时走 speaker 模拟输出。

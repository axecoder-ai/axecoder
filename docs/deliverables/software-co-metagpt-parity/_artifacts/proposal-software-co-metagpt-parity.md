## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** Software Co. 模式完全按 MetaGPT 论文机制对齐。
- **调研来源：** `docs/deliverables/software-co-metagpt-parity/_artifacts/00-research-links.md`、MetaGPT 论文 §3
- **选定基础：** 提案 2 – 论文级完整原生对齐
- **用户调整摘要：** 无额外调整

### 最终方案 – 论文级完整原生 MetaGPT 对齐

- **概述：** 在既有 `electron/main/sop/` 上补齐 MetaGPT 三块核心：① 结构化 artifact 全量传递（路径 + Read，放宽 Pool 截断）；② 逐 task 实现 + implement 内可执行反馈（`sop-task-runner` + `sop-test-runner`）；③ Action 依赖图驱动编排（`sop-action-graph`）+ 角色工具剖面 + Project Manager 派发。Design schema 扩展 API/时序图；Engineer implement 复用 workshop session 保留调试上下文；轻量意图分流跳过不必要阶段。
- **关键变更：**
  - `electron/main/sop/sop-task-runner.ts`、`sop-test-runner.ts`、`sop-action-graph.ts`、`sop-role-tools.ts`、`sop-intent.ts`（新建）
  - `electron/main/sop/sop-pipeline-engine.ts` — action-graph 驱动 + 逐 task implement
  - `electron/main/sop/message-pool.ts`、`sop-prompts.ts`、`sop-gates.ts`、`schemas/design.ts`、`sop-types.ts`
  - `electron/main/builtin-workflow-roles.ts`、`users-types.ts` — `project_manager`
  - `electron/main/workshop/workshop-agent-speaker.ts` — implement session 复用
  - `src/components/workbench/WorkshopSopProgress.vue` — task 级进度
  - `tests/unittest/UT-sop-*` 扩展 + 新套件
- **权衡：** 改动面大；不引入 MetaGPT Python；Agent 模式零影响。
- **验证：** 全部 UT-sop-* 全绿；UT-collab-workshop / UT-chat-mode-* 回归；手工绿场需求跑通。
- **待解决问题：** MetaGPT Python 互操作、自定义 SOP 编辑器留后续。

### 未采纳方案说明

- **未选：** 提案 1 – 执行闭环补齐
- **原因：** 用户选定完整对齐。

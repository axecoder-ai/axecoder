## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 将 AxeCoder 对齐 MetaGPT 核心能力：SOP 流水线、结构化交付物、Message Pool、QA 闭环、`software-company` ChatMode。
- **调研来源：** `docs/deliverables/metagpt-alignment/_artifacts/00-research-links.md`
- **选定基础：** 提案 2 – 完整原生对齐
- **用户调整摘要：** 无额外调整

### 最终方案 – 完整原生 MetaGPT 对齐

- **概述：** 新增 `electron/main/sop/` 模块：`sop-pipeline-engine` 固定阶段机、`message-pool`（causeBy + watch）、`sop-gates` 闸门、`qa-loop` 测试回流；扩展 Workshop 会话字段与 `software-company` ChatMode；UI 增加 SOP 阶段条；rppit 步骤映射 SOP phase。
- **关键变更：**
  - `electron/main/sop/*` — 类型、schema、message-pool、pipeline、qa-loop、rppit-phase-map
  - `electron/main/workshop/workshop-types.ts` — `causeBy`、`sopPhase`、`sopSlug`
  - `electron/main/builtin-workflow-roles.ts` — `qa_engineer`、`watchActions`
  - `electron/main/workshop-ipc.ts` — `orchestrationChatMode === 'software-company'` 分支
  - `electron/main/agent/chat-mode.ts`、`src/utils/chat-modes.ts` — 新模式
  - `src/components/workbench/WorkshopSopProgress.vue`、`WorkshopChatSection.vue`
  - `tests/unittest/UT-sop-pipeline/`、`UT-sop-message-pool/`、`UT-sop-qa-loop/`
- **权衡：** 完整对标 MetaGPT；改动面大，需严格单测防回归 Multi-Agent/Reflection。
- **验证：** 上述单测全绿；既有 UT-collab-workshop / UT-coordinator-multi-agent 不回退；手工一行需求跑通 7 阶段。
- **待解决问题：** 自定义 SOP 编辑器、MetaGPT Python 互操作、真多人协作留后续。

### 未采纳方案说明

- **未选：** 提案 1 – SOP 流水线 MVP
- **原因：** 用户选定完整原生对齐。

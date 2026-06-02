# 已确认解决方案提案：Agent 探索编排（Chat · Claude 对齐）

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 降低 Chat Agent 相对 Claude Code 的无效工具轮次；对齐 Claude 的 Todo 回灌、Explore 委派指引、FRC 说明与 scratchpad，不实现硬阶段状态机。
- **调研来源：** `docs/research/research-axecoder-vs-claude-code.md`；`claude-code/src/constants/prompts.ts`、`exploreAgent.ts`、`attachments.ts`、`TodoWriteTool.ts`
- **上游提案：** `docs/proposals/proposal-agent-explore-orchestration.md`（双方案草稿）
- **选定基础：** 提案 1 – 轻量编排回灌（Claude 对齐变体 `p1-claude`）
- **用户调整摘要：**
  - **范围：** 仅 Chat Agent（`startAgentTurn` / `runAgentLoopUntilDoneOrPending`）；**Workshop 本期不改**。
  - **对齐 Claude：** 软编排（prompt + 每轮注入），不做强制 explore→implement phase。

---

### 最终方案 – Chat 软编排（Claude 对齐）

- **概述：** 在现有 Agent 循环上增加与 Claude Code 同构的三层能力：（1）system prompt 补充 TodoWrite / Agent(Explore) / 并行 / 勿重复子代理工作；（2）每轮 `prepareSessionBeforeModel` 注入当前 Todo 列表（及可选 scratchpad 探索摘要）为 `<system-reminder>`；（3）补强 FRC 与 scratchpad 说明，引导模型在 assistant 文本中留存要点。Explore 子代理完成后可将报告写入 `scratchpad/explore-summary.md` 供后续轮次读取。

- **相对选定提案的变更：** 明确排除 Workshop；不实现提案 2 阶段门控；Explore 报告落盘为可选增强（子代理返回时写入）。

- **关键变更：**
  - `electron/main/agent/agent-system-prompt.ts` — `getTodoManagementSection`、`getAgentDelegationSection`、`getScratchpadInstructionsSection`、`getFunctionResultClearingSection`
  - `electron/main/agent/agent-context-inject.ts`（新）— `buildTodoReminderInjection`、`buildScratchpadInjection`
  - `electron/main/agent/agent-loop.ts` — `prepareSessionBeforeModel` 调用注入
  - `electron/main/agent/agent-ext-executor.ts` — TodoWrite 工具结果文案对齐 Claude
  - `electron/main/agent/tool-executor.ts` — `Agent` + `explore` 成功后将 report 写入 scratchpad
  - `tests/unittest/UT-agent-explore-orchestration/`

- **权衡：**
  - 优点：改动集中、与 Claude 实现路径一致、Chat 立即可测。
  - 缺点：仍依赖模型遵守指引；Workshop 重复探索需另开任务。
  - 风险：reminder 过长需控制条数；与现有 context compact 共存。

- **验证：**
  - 单测：注入片段含 todo；有 scratchpad 摘要时含路径列表。
  - `npm test` 全绿。
  - 手工：仿页面类 prompt 对比 toolLog 次数（非阻塞验收）。

- **待解决问题：**
  - Todo v2（Task*）与 TodoWrite 并存时的 UI（本期仅回灌 TodoWrite 列表）。
  - 二期：Workshop 共享 scratchpad。

### 未采纳方案说明

- **未选：** 提案 2 – 显式两阶段状态机。Claude Code 普通 Chat 无此机制；用户要求对齐 Claude 实现。

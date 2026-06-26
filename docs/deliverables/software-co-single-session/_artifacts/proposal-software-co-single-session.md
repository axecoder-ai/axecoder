**状态：** 已确认

## 已确认解决方案提案

**上下文：**
- **请求：** Software Co. 效率对齐 Agent——单 session 连续执行，SOP 为软约束。
- **调研来源：** `electron/main/sop/`、`electron/main/agent/agent-loop.ts`、`docs/deliverables/software-co-single-session/_artifacts/00-research-links.md`
- **选定基础：** 提案 1 – 单 Session 软 SOP
- **用户调整摘要：** 无额外调整

### 最终方案 – 单 Session 软 SOP（默认 Fast）

- **概述：** 新增 `sop-fast-pipeline` 作为 `software-company` 默认入口：一次（可复用）Agent session 跑完全流程；`chatMode: software-company` + 软 SOP prompt；开发角色工具全开。原 `sop-pipeline-engine` 保留为严格模式（`AXECODER_SOP_STRICT=1`）。
- **关键变更：**
  - `electron/main/sop/sop-fast-pipeline.ts`（新建）
  - `electron/main/sop/sop-prompts.ts` — `sopSoftOrchestrationPromptBlock`
  - `electron/main/agent/agent-loop.ts` — `sopFast` 选项：software-company chatMode、跳过角色工具过滤
  - `electron/main/agent/chat-mode.ts` — 更新 software-company addon 文案
  - `electron/main/workshop-ipc.ts` — 默认 fast
  - `electron/main/sop/index.ts` — 导出 `isSopStrictMode`、`sendSopFastPipelineMessage`
  - `tests/unittest/UT-sop-fast-pipeline/`
- **权衡：** 结构化交付物依赖模型；严格模式可回退审计流水线。
- **验证：** UT-sop-fast-pipeline 全绿；UT-sop-pipeline 在 strict 环境变量下回归。
- **待解决问题：** UI 阶段条可后续按 artifact checkpoint 细化（非阻塞）。

### 未采纳方案说明

- **未选：** 提案 2 – 保留硬编排局部合并
- **原因：** 无法达到 Agent 级效率，与第一性原理目标不符。

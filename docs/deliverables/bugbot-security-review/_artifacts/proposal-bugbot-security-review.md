**状态：** 已确认（由 `/create-proposals` 生成）

## 已确认解决方案提案

**上下文：**
- **请求：** 在 AxeCoder Chat Agent 中实现 `bugbot` / `security-review` 子代理，对齐 Cursor Task 专型与 review skill 契约。
- **调研来源：** `docs/deliverables/bugbot-security-review/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-bugbot-security-review.md`
- **选定基础：** 提案 1 – Cursor 对齐专型 + Git Diff 预注入
- **用户调整摘要：** 无额外调整

### 现状总结

AxeCoder 已有 9 种 CC 对齐 `subagent_type`，矩阵 §5 将 bugbot/security-review 标为「未实现」。Cursor 通过专型 + 固定 prompt 形状 + 子代理内 diff 计算完成审查。

---

### 最终方案 – Cursor 对齐专型 + Git Diff 预注入

- **概述：** 扩展 `SubagentType` 与 `agent-subagent-types.ts`；新增 `agent-review-diff.ts` 解析 Cursor review prompt（`Full Repository Path` / `Diff` / `Base Branch` / `Custom Instructions`）并用 git 计算 diff；`runSubAgentTask` 在 bugbot/security-review 启动时将 diff/stat 注入 user 消息；新增 `.cursor/skills/review-bugbot`、`review-security`；更新 Task 工具 enum 与描述。
- **相对选定提案的变更：** 无（按原提案落地）。
- **关键变更：**
  - `electron/main/agent/agent-review-diff.ts`（新）
  - `electron/main/agent/agent-subagent-types.ts`
  - `electron/main/agent/agent-types.ts`
  - `electron/main/agent/agent-subagent.ts`
  - `electron/main/agent/agent-tool-prompts.ts`
  - `electron/main/ai/model-resolve.ts`
  - `electron/main/agent/agent-system-prompt.ts`（委派提示）
  - `.cursor/skills/review-bugbot/SKILL.md`、`.cursor/skills/review-security/SKILL.md`
  - `tests/unittest/UT-bugbot-security-review/`
- **权衡：** diff 过大截断（与 Bash 输出同量级 ~200k）；非 git 目录返回明确错误；审查质量依赖本地 LLM 非 Cursor 云端 Bugbot。
- **验证：** UT 覆盖 prompt 解析、diff 计算（fixture repo）、类型过滤；`npm test` 全绿；手工 Task(bugbot) 审查。
- **待解决问题：** 超大 monorepo diff 分文件审查可二期；与 Cursor 云端 Bugbot 规则 1:1 不对齐。

### 未采纳方案说明

- **未选：** 提案 2 – 轻量专型（仅 prompt）
- **原因：** 用户选定全量对齐；轻量方案审查质量不稳定且后续仍需补 diff 模块。

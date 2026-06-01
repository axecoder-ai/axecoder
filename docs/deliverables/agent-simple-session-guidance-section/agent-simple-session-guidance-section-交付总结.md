---
任务名: agent-simple-session-guidance-section
完成日期: 2026-06-01
选定方案: 提案 1 – 动态函数
审查结论: 通过
单测: 全绿（10/10）
---

# agent-simple-session-guidance-section 交付总结

## 1. 概述

对齐 Claude Code 系统提示 **§8 Session-specific guidance**（`getSessionSpecificGuidanceSection`），在 Agent 系统提示中按会话能力注入「工具被拒怎么办」「用户自跑 shell」等说明。

- **选型：** 提案 1（动态拼接，无项返回 `null`）
- **交付目录：** `docs/deliverables/agent-simple-session-guidance-section/`

---

## 2. 方案

- `getSessionSpecificGuidanceSection(options?)` 输出 `# Session-specific guidance` 段。
- 默认包含：`AskUserQuestion`（不理解工具被拒时）、`! <command>`（需用户本机交互命令，`interactive` 默认 true）。
- `buildAgentSystemPrompt`：`using tools` → **session guidance** → tool path rules → project root。
- 不含 Agent/Skill/Verification（当前产品无对应工具）。

---

## 3. 方案选型过程

推荐提案 1；用户通过 `/rppit 实现` 按推荐执行。详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

单测先行 → 实现 §8 → re-export → Vitest。详见 `_artifacts/plan-agent-simple-session-guidance-section.md`。

---

## 5. 实现说明

见 `_artifacts/05-implement-report.md`：核心改动 `agent-system-prompt.ts`、`agent-tool-defs.ts`、单测扩展。

---

## 6. 单元测试执行情况

`npm test -- tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` — **10 passed，全绿**。详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 自动化：§8 要点、空配置 `null`、`interactive: false`、完整 prompt 顺序。
- 手工/集成：待补充（验证 Agent 对话中可见 `# Session-specific guidance`）。

---

## 8. 代码审查

**通过**。无阻塞项；`! <command>` 待产品实现后 E2E。详见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 修改 | §8 + 组装 |
| `electron/main/agent/agent-tool-defs.ts` | 修改 | re-export |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | 修改 | §8 单测 |

---

## 10. 遗留项与后续建议

- §9 `getSimpleToneAndStyleSection`
- 聊天输入 `! <command>` 产品能力（文案已预埋）
- Agent / Skill / Verification 子段（工具就绪后扩展 `enabledToolNames`）

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-agent-simple-session-guidance-section.md` |
| `_artifacts/plan-agent-simple-session-guidance-section.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |

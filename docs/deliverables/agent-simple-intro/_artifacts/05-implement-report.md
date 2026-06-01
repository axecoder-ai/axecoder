# 功能实现报告：agent-simple-intro

## 功能说明

- 新增 `getSimpleIntroSection()`：结构对齐 Claude Code §2（AxeCoder 身份 + `CYBER_RISK_INSTRUCTION` + URL 规则）。
- 新增 `CYBER_RISK_INSTRUCTION` 常量（§3 英文原文）。
- `buildAgentSystemPrompt` 移至 `agent-system-prompt.ts`，组装顺序：intro → 工具/任务规则 → project root。
- `agent-tool-defs.ts` 保留 `AGENT_TOOLS` 并 re-export 组装 API；`agent-loop.ts` 无需修改。

## 修改的文件列表

| 文件 | 类型 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 新增 |
| `electron/main/agent/agent-tool-defs.ts` | 修改 |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | 新增 |
| `tests/unittest/UT-agent-glob/agent-tool-defs.test.ts` | 修改 |

## 单元测试覆盖

- `getSimpleIntroSection`：AxeCoder 身份、cyber、URL 文案
- `buildAgentSystemPrompt`：含完整 intro、Glob/Grep、project root；无旧版重复身份句
- re-export：`agent-tool-defs` 路径仍可 `buildAgentSystemPrompt`

## 注意事项

- `AGENT_SYSTEM_PROMPT`（deprecated）现为仅工具规则段，不再含 intro；仓库内无其它引用。
- Output Style 分支未实现；未来可在 `getSimpleIntroSection(opts)` 扩展。
- 手工 Agents E2E 未在本轮自动化执行，见交付总结「测试报告」。

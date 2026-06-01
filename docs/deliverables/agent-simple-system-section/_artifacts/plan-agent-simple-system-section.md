# Agent getSimpleSystemSection 设计文档

## 当前背景

- 已实现 `getSimpleIntroSection`（§2–3），`buildAgentSystemPrompt` 为 intro + 工具规则 + project root。
- Claude Code §15 要求 intro 后接 `getSimpleSystemSection`（§4）。

## 需求

### 功能需求

- 导出 `getSimpleSystemSection()`，六条 bullet 与 `claude-code-system-prompts-full.md` §4 英文一致。
- `buildAgentSystemPrompt` 顺序：`getSimpleIntroSection()` → `getSimpleSystemSection()` → `AGENT_DOING_TASKS_SECTION` → project root。

### 非功能需求

- 最小改动；`agent-loop.ts` 无变更。
- 单测覆盖 §4 关键句与段落顺序。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 修改 |
| `electron/main/agent/agent-tool-defs.ts` | re-export |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | 扩展 |

## 实施计划

1. 扩展单测：§4 关键句、intro/system/doing-tasks 顺序。
2. 实现 `getSimpleSystemSection()` 并接入 `buildAgentSystemPrompt`。
3. `npm test -- tests/unittest/UT-agent-system-prompt/` 全绿。

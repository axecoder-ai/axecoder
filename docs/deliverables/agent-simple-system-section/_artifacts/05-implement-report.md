# 功能实现报告

## 功能说明

- 新增 `getSimpleSystemSection()`，内容为 同类 Agent `参考实现-system-prompts-full.md` §4 六条 bullet 英文原文。
- `buildAgentSystemPrompt` 组装顺序对齐 §15：`getSimpleIntroSection()` → `getSimpleSystemSection()` → `AGENT_DOING_TASKS_SECTION` → project root。
- `agent-tool-defs.ts` re-export `getSimpleSystemSection`。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 新增 `getSimpleSystemSection`，接入组装 |
| `electron/main/agent/agent-tool-defs.ts` | re-export |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | §4 要点与顺序单测 |

## 注意事项

- Hooks / permission mode 文案为模型行为约束；AxeCoder 产品能力可后续对齐，文案保持 1:1。
- `agent-loop.ts` 无改动，仍通过 `buildAgentSystemPrompt` 注入 system 消息。

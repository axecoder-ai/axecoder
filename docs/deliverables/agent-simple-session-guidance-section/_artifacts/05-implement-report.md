# 功能实现报告

## 功能说明

- 新增 `getSessionSpecificGuidanceSection`（同类 Agent §8）：标题 `# Session-specific guidance`，按工具/交互开关拼接 bullet。
- 默认 bullets：工具被拒时用 `AskUserQuestion`；需用户本机交互命令时提示 `! <command>`。
- `buildAgentSystemPrompt` 在 §7 与 AxeCoder 路径规则之间插入该段（有内容时）。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | §8 函数与组装 |
| `electron/main/agent/agent-tool-defs.ts` | re-export |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | §8 与顺序断言 |

## 注意事项

- Agent/Skill/Verification 未实现，待对应工具落地后再扩展 `enabledToolNames` 分支。
- `! <command>` 文案已写入 prompt；聊天 UI 若尚未支持 bang，需后续产品对齐。

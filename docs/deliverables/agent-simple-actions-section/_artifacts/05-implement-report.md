# 功能实现报告

## 功能说明

- 新增 `getActionsSection()`：同类 Agent §6「谨慎执行操作」英文全文（文档 `...` 按公开完整句补全；保留 `CLAUDE.md` 措辞）。
- `buildAgentSystemPrompt` 顺序对齐 §15：`intro → system → doing tasks → actions → tool rules → project root`。
- `agent-tool-defs.ts` re-export `getActionsSection`。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | §6 函数与组装 |
| `electron/main/agent/agent-tool-defs.ts` | re-export |
| `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts` | §6 与顺序断言 |

## 注意事项

- §7 `getUsingYourToolsSection` 仍为后续项；工具路径规则段暂代部分 §7 语义。

# 功能实现报告

## 功能说明

1. **`getUsingYourToolsSection()`**：§7 主段（专用工具 vs Bash、并行/顺序）；不含 TodoWrite/Agent/Skills。
2. **`Bash` Agent 工具**：`agent-bash.ts` 在项目根非交互执行命令（超时 120s 默认、输出截断）；`tool-executor` / `agent-tool-defs` / types 已接入。
3. **`buildAgentSystemPrompt`**：`actions → using tools → tool path rules → project root`（§15）。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | §7 + 组装 |
| `electron/main/agent/agent-bash.ts` | 新增 |
| `electron/main/agent/agent-types.ts` | Bash 类型 |
| `electron/main/agent/agent-tool-defs.ts` | Bash 定义 |
| `electron/main/agent/tool-executor.ts` | Bash 执行 |
| `tests/unittest/UT-agent-system-prompt/` | §7 测试 |
| `tests/unittest/UT-agent-bash/` | Bash 单测 |

## 注意事项

- Bash 与 UI 终端 IPC 独立，避免抢占交互式 shell。
- Bash 写盘/删盘仍受 §6 与现有 pending 写确认约束（Bash 本身立即返回输出）。

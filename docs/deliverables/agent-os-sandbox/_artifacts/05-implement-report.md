# 功能实现报告：Agent OS 级沙箱

## 功能说明

- **execpolicy 策略引擎**：读取 `~/.axecoder/execpolicy.toml`，执行前评估 allow/deny/ask；deny 在 `tool-executor` 与 `runAgentBash` 双层拦截。
- **macOS Seatbelt**：`buildShellSpawnSpec` 在 darwin 且 `sandbox-exec` 可用时，用 SBPL 策略包装 shell；默认 `workspace-write`、禁止网络。
- **full_parity**：218 条 BASH_ARITY_TABLE、arity-aware `prefixAllowMatches`、heredoc 剥离、wildcard `patternMatches`、cargo/npm cache SBPL 例外、`.axecoder` 只读子路径保护。

## 修改文件列表

| 路径 | 类型 |
|------|------|
| `electron/main/agent/agent-bash-arity-table.ts` | 新增 |
| `electron/main/agent/agent-command-arity.ts` | 新增 |
| `electron/main/agent/agent-execpolicy-matcher.ts` | 新增 |
| `electron/main/agent/agent-execpolicy.ts` | 新增 |
| `electron/main/agent/agent-sandbox-seatbelt.ts` | 新增 |
| `electron/main/agent/agent-bash.ts` | 修改 |
| `electron/main/agent/agent-bash-tasks.ts` | 修改 |
| `electron/main/agent/tool-executor.ts` | 修改 |
| `tests/unittest/UT-agent-os-sandbox/*.test.ts` | 新增 |

## 单测覆盖

- execpolicy：allow/deny/ask、arity、wildcard（9 用例）
- seatbelt：SBPL 生成、args 结构、cargo/npm、.axecoder 保护（4 用例）
- integration：tool-executor deny 路径（1 用例）

## 注意事项

- 非 macOS 跳过 Seatbelt，仅 execpolicy + git 危险命令。
- execpolicy 无配置文件时默认 allow（不阻断）。
- hooks 执行路径本期未加沙箱。

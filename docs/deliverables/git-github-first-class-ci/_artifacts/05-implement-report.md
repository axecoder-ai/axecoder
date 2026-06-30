# 功能实现报告

## 功能说明

- **Git 只读工具**：GitStatus / GitDiff / GitLog（`git-agent-read.ts` + tool-executor），无需用户批准。
- **CI forge prompt**：`getGitCiPromptSection`、`buildInvestigateCiPrompt`；主 Agent 与 forge 段合并 CI 工作流。
- **gh CI 只读**：`gh run view/list`、`gh workflow view/list` 自动执行。
- **子代理 forge 注入**：`buildDefaultSubAgentSystemPrompt` 含 forge + CI 段；ci-investigator/git-commit/shell 前缀强化。
- **linkedPrUrl**：`computeSimpleEnvInfo` 可选写入 Environment。
- **斜杠**：`/investigate-ci`（别名 `/ci`）。
- **Bash 描述**：明确 Git 工具 vs gh 分工。

## 修改文件

| 路径 | 说明 |
|------|------|
| `electron/main/git-forge/git-agent-read.ts` | 新增 |
| `electron/main/git-forge/forge-prompt.ts` | CI 段 + investigate prompt |
| `electron/main/agent/agent-bash-readonly.ts` | gh CI 只读前缀 |
| `electron/main/agent/agent-subagent-types.ts` | 子代理前缀 + shell 工具白名单 |
| `electron/main/agent/agent-system-prompt.ts` | 子代理 forge、linkedPrUrl |
| `electron/main/agent/agent-tool-prompts.ts` | Git 工具 + Bash 描述 |
| `electron/main/agent/agent-types.ts` | GitStatus/GitDiff/GitLog |
| `electron/main/agent/tool-executor.ts` | Git 工具执行 |
| `electron/main/git-ipc.ts` | investigateCiPrompt IPC |
| `electron/preload/index.ts` | 桥接 |
| `src/types/axecoder.d.ts` | 类型 |
| `src/slash-commands/builtin.ts` | `/investigate-ci` |
| `tests/unittest/UT-git-forge/git-forge-ci.test.ts` | 新增 |
| `tests/unittest/UT-git-agent-tools/git-agent-tools.test.ts` | 新增 |

## 注意事项

- CI/PR 远程仍 exclusively Bash + `forgeEnvForBash`；未新增 `github_*` REST 工具。
- `/investigate-ci` 暂未从 Agent session 读取 linkedPrUrl（可后续加 IPC）；Environment 段在 rebuild prompt 时可用 linkedPrUrl 选项。

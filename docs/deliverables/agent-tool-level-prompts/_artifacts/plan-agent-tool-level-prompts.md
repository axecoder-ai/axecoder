# 计划：agent-tool-level-prompts

## 阶段 1 — 单测（红）

1. 新建 `UT-agent-tool-level-prompts`：`AGENT_TOOLS` 共 10 个工具名齐全。
2. 每工具 `description.length >= 400`（strict 下限，Bash/Agent 更高）。
3. 关键短语：Bash 含 `Do NOT use Bash` 反向约束的镜像（cat/sed/find）、Read 含 `before Edit`、Agent 含 `cannot spawn`、AskUserQuestion 含 `genuinely stuck`。

## 阶段 2 — 实现

1. 新建 `agent-tool-prompts.ts`（`buildAgentTools()`）。
2. `agent-tool-defs.ts` 引用，保留 re-export。
3. 跑相关单测全绿。

## 阶段 3 — 验收

- 落盘 `05-implement-report.md`、`05-unittest.md`、代码审查。

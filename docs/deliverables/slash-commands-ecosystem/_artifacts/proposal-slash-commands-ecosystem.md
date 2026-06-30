# 解决方案提案：斜杠命令与扩展生态

**状态：** 已确认

**上下文：**
- **请求：** 对齐调研 `research-axecoder-vs-参考实现.md` §4：内置斜杠命令（/help、/clear、/compact、/rewind、/mcp、/hooks、/plan、/skills）、Skill 动态命令、自定义 output-styles 目录。
- **调研来源：** `docs/research/research-axecoder-vs-参考实现.md` §4；`docs/proposals/proposal-slash-commands.md` 提案 1 基础。

## 已确认方案（提案 1 扩展）

- **概述：** 在 `src/slash-commands/` 保持 Renderer 注册表与 `ChatPane.send()` 拦截；需 Main 能力的命令通过少量 IPC（MCP、Skills、output-styles、plan/rewind 说明）委托；Skill 名动态注册为 `/skillName`；自定义风格从 `~/.axecoder/output-styles`、`~/.claude/output-styles`、`<project>/.axecoder/output-styles` 加载并接入 `resolveAgentOutputStyle`。
- **关键变更：**
  - `src/slash-commands/builtin.ts` — 内置命令全集
  - `src/slash-commands/registry-refresh.ts` — Skill 动态注册
  - `electron/main/agent-output-styles-custom.ts` — 自定义风格加载
  - `electron/main/agent-ipc.ts` — listMcp / listSkills / loadSkill / listOutputStyles / setOutputStyle / planModeHelp / rewindHelp
- **不做：** Main 统一 `slash:execute` 管道（提案 2）；Claude 70+ 命令全量移植；checkpoint 级 /rewind 运行时。

## 验证

- `npm test` 全绿；手工 `/help`、`/style`、`/skills`、Skill 动态命令。

# 调研链接

- `参考实现/docs/参考实现-system-prompts-full.md` §7、§15
- `electron/main/agent/agent-system-prompt.ts`、`agent-tool-defs.ts`（现有工具：Read/Edit/Write/Glob/Grep/Delete/Move/AskUserQuestion，无 Bash/TodoWrite/Agent）
- `docs/deliverables/agent-simple-actions-section/`

**调研缺口：** 无 `prompts.ts`；§7 子段 Agent/Skills/TodoWrite 在 AxeCoder 未启用，方案 1 仅接入 §7 主列表 + 并行规则。

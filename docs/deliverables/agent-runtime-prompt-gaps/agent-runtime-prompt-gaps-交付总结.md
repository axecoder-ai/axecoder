# agent-runtime-prompt-gaps 交付总结

| 任务 | agent-runtime-prompt-gaps |
|------|---------------------------|
| 日期 | 2026-06-01 |
| 审查 | 通过 |
| 单测 | 166/166 绿 |

## 概述

落地 `research-axecoder-vs-参考实现.md` **§3** 所列、系统提示已承诺但此前无运行时的能力。

## 实现要点

1. **Hooks** — `hooks.json` + 工具前后 shell；`/hooks` 查看配置  
2. **压缩** — Agent 自动 + `/compact` 聊天会话  
3. **FRC** — 旧 tool result 替换为 cleared 占位  
4. **`! cmd`** — 用户 shell 输出进聊天  
5. **Permission** — `acceptEdits` / `disallowedTools` 等  
6. **Scratchpad** — 每会话隔离目录  
7. **MCP 动态段** — 有 MCP 配置时写入 system prompt  
8. **token_budget** — 接近预算时 system-reminder  
9. **Proactive** — 周期性 check-in reminder  

## 归档

见 `_artifacts/`：`05-implement-report.md`、`05-unittest.md`、`06-code-review.md`

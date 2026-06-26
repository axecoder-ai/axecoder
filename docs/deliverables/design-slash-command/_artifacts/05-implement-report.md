# 功能实现报告

## 功能说明

- **`/design`**（无 `DESIGN.md`、无参）：列出 `APP_ROOT/design/` 下含 `DESIGN.md` 的主题目录，提示 `/design <theme>` 复制。
- **`/design <theme>`**（无 `DESIGN.md`）：将 `design/<theme>/DESIGN.md` 复制到项目根 `DESIGN.md`，并预览配色。
- **`/design`**（已有 `DESIGN.md`）：解析 YAML `colors:` 展示配色，提示删除 `DESIGN.md` 可取消约束。
- **Agent 内置规则**：`buildAgentSystemPrompt` 在存在 `DESIGN.md` 时注入 `project-design-md` 规则段（含配色摘要），要求前端 UI 遵循 DESIGN.md。

## 修改文件列表

| 文件 | 说明 |
|------|------|
| `electron/main/design/design-slash.ts` | 新增：列库、复制、配色解析、斜杠逻辑、Agent 规则 |
| `electron/main/agent-ipc.ts` | `agent:designSlash` IPC |
| `electron/preload/index.ts` | `agentDesignSlash` 暴露 |
| `src/types/axecoder.d.ts` | 类型声明 |
| `src/slash-commands/builtin.ts` | 注册 `/design` |
| `electron/main/agent/agent-system-prompt.ts` | 动态注入设计规范 |
| `tests/unittest/UT-design-slash/design-slash.test.ts` | 单测 |
| `tests/unittest/UT-slash-commands/registry.test.ts` | 断言注册 `design` |

## 单测覆盖

- `parseDesignColors`：YAML colors 解析
- `listAppDesignThemes`：主题目录列表
- `runDesignSlash`：三分支 + 未知主题错误
- `buildDesignMdAgentRule`：有/无 DESIGN.md

## 注意事项

- 设计库路径为应用根 `design/`，非用户项目内 `design/`。
- 主题名仅允许 `[a-zA-Z0-9._-]`，大小写不敏感匹配。
- 配色展示默认最多 24 项，复制成功预览最多 12 项。

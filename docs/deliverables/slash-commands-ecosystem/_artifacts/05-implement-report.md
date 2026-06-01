# 功能实现报告

## 功能说明

1. **内置斜杠命令：** `/help` `/clear` `/new` `/model` `/compact` `/hooks` `/mcp` `/plan` `/skills` `/rewind` `/style`（别名 `/output-style`）
2. **Skill 动态命令：** 打开项目时扫描 `.cursor/skills`，将每个 Skill 注册为 `/skillName`，执行时加载 SKILL.md 注入会话
3. **自定义 output-styles：** 从 `~/.axecoder/output-styles`、`~/.claude/output-styles`、`<project>/.axecoder/output-styles` 读取 `*.md`；Agent 回合前刷新缓存；`/style` 与设置说明对齐

## 修改文件

| 路径 | 说明 |
|------|------|
| `src/slash-commands/builtin.ts` | 内置命令 |
| `src/slash-commands/registry-refresh.ts` | 动态 Skill 注册 |
| `src/slash-commands/dynamic-skills.ts` | Skill 命令构建 |
| `electron/main/agent-output-styles-custom.ts` | 自定义风格加载 |
| `electron/main/agent-output-styles.ts` | resolve 合并自定义 |
| `electron/main/agent-ipc.ts` | 新 IPC |
| `electron/preload/index.ts` | 桥接 |
| `src/types/axecoder.d.ts` | 类型 |
| `src/components/workbench/ChatPane.vue` | refresh 注册表 |
| `electron/main/agent/agent-loop.ts` | 回合前刷新风格缓存 |
| `tests/unittest/UT-slash-commands/*` | 单测 |
| `tests/unittest/UT-agent-output-styles-custom/*` | 单测 |

## 注意事项

- `/rewind` 为 Git 状态说明，非 checkpoint 回滚
- `/mcp` 为配置列举 stub，工具执行仍依赖 IDE MCP 集成
- MCP 实时调用未在本期接线

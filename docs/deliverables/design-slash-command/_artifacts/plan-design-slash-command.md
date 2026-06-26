# /design 斜杠命令 设计文档

## 当前背景

- AxeCoder 内置 `design/<brand>/DESIGN.md` 设计库（约 70+ 主题）。
- 斜杠命令在 `src/slash-commands/builtin.ts` 注册，复杂逻辑委托 Main IPC。
- Agent system prompt 已通过 `loadAlwaysApplyRulesPrompt` 注入工作区规则。

## 需求

### 功能需求

- `/design`：项目有 DESIGN.md 时展示配色与删除提示。
- `/design`（无参）：列出内置 `design/` 主题名。
- `/design <theme>`：复制 `design/<theme>/DESIGN.md` 到项目根。
- 项目存在 DESIGN.md 时，Agent 前端开发遵循其样式。

### 非功能需求

- 主题名防路径穿越；设计库读 `APP_ROOT/design`。
- 配色解析仅提取 YAML `colors:` 段，展示可截断。

## 设计决策

### 1. 逻辑归属 Main

与 `/init`、`/style` 一致，`runDesignSlash` 在 Main，`builtin.ts` 薄封装。

### 2. Agent 规则注入

在 `buildAgentSystemPrompt` 调用 `buildDesignMdAgentRule`，不往用户项目写 `.cursor/rules`（避免与 alwaysApply 机制冲突）。

## 技术设计

### 文件变更

| 文件 | 操作 |
|------|------|
| `electron/main/design/design-slash.ts` | 新增 |
| `electron/main/agent-ipc.ts` | 修改 |
| `electron/preload/index.ts` | 修改 |
| `src/types/axecoder.d.ts` | 修改 |
| `src/slash-commands/builtin.ts` | 修改 |
| `electron/main/agent/agent-system-prompt.ts` | 修改 |
| `tests/unittest/UT-design-slash/design-slash.test.ts` | 新增 |
| `tests/unittest/UT-slash-commands/registry.test.ts` | 修改 |

## 实施计划

1. **阶段一：** 实现 `design-slash.ts` + 单测（list/copy/parse/inject）
2. **阶段二：** IPC + builtin `/design` + registry 测试
3. **阶段三：** system prompt 注入 + 全量 `npm test`

## 测试策略

- 临时目录 mock `APP_ROOT/design/test/DESIGN.md`
- 断言 `runDesignSlash` 三分支与 `buildDesignMdAgentRule`

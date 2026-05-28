# 添加聊天斜杠命令

为 WritCraft 聊天输入框增加**斜杠命令**（用户输入 `/命令名`）。命令在 Renderer 的 `src/slash-commands/` 实现，由 `ChatPane.send()` 在调用 `ai:chat` / `agent:send` **之前**拦截执行，**不会**把该行发给模型。

设计文档：`docs/plans/plan-slash-commands-proposal1.md`  
参考：`claude-code/src/commands/<name>/index.ts`、`src/utils/slashCommandParsing.ts`

## 开始前

向用户确认（未提供则询问）：

1. **命令名**（小写英文，如 `clear`、`export`；用户输入 `/clear`）
2. **别名**（可选，如 `reset` → `/reset` 等同 `/clear`）
3. **简介**（`description`，会用于未来的 `/help`）
4. **行为**：改会话 / 打开 UI / 调 `window.writcraft` / 仅展示文本
5. **是否需要参数**（`args` 为 `/命令` 后第一个空格起的整段字符串）

## 目录结构（固定）

```text
src/slash-commands/
  types.ts          # SlashCommandDef、SlashContext、SlashRunResult（一般不改）
  parse.ts          # parseSlashCommand（一般不改）
  run.ts            # runSlashCommand 分发（一般不改）
  registry.ts       # COMMANDS 注册表（每加一条命令改这里）
  <name>/index.ts   # 本命令实现（新建）
```

## 实现清单（按顺序）

### 1. 新建命令：`src/slash-commands/<name>/index.ts`

导出默认 `SlashCommandDef`，`run` 用**流水账**写清步骤，少抽函数：

```ts
import type { SlashCommandDef, SlashContext } from '../types'

const myCmd: SlashCommandDef = {
  name: 'mycmd',
  aliases: ['mc'], // 可选
  description: '一句话说明',
  async run(ctx: SlashContext, args: string) {
    const session = ctx.getSession()
    if (!session) {
      return { ok: false, message: '无活动会话。' }
    }
    // 读 args、改 session、调 IPC…
    await ctx.persist()
    return { ok: true, message: '执行结果展示在聊天区。' }
  },
}

export default myCmd
```

**返回值约定（`SlashRunResult`）**

| 返回 | 含义 |
|------|------|
| `{ ok: true, message: '...' }` | 成功；在聊天区插入一条 assistant 文本 |
| `{ ok: true, message: '', silent: true }` | 成功且不插消息（如已 `newChat()` 切会话） |
| `{ ok: false, message: '...' }` | 失败；assistant 展示错误文案 |

**`SlashContext` 常用能力**

| 字段 | 用途 |
|------|------|
| `getSession` / `setSession` | 读写当前 `ChatSession`（含 `messages`） |
| `persist` | 保存到 `<项目>/.writcraft/sessions/` |
| `newChat` | 新建会话（等同侧栏 `+`） |
| `getModelsFile` / `setModelsFile` / `setActiveModel` | 模型切换 |
| `openModelsSettings` | 打开设置里的模型页 |
| `projectRoot` | 当前项目根路径 |

需要其它能力时，优先在 `ChatPane.vue` 的 `buildSlashContext()` 里扩展 `SlashContext`，再改 `types.ts`。

### 2. 注册：`src/slash-commands/registry.ts`

```ts
import myCmd from './mycmd/index'

const COMMANDS: SlashCommandDef[] = [
  myCmd,
  // …已有命令
]
```

`findCommand` / `allCommands` 已按 `name` 与 `aliases` 匹配（**大小写不敏感**）。

### 3. 单元测试：`tests/unittest/UT-slash-commands/`

- **必改** `run.test.ts`：为新命令加 1～2 个用例（mock `SlashContext`，调 `runSlashCommand('/mycmd', ctx)`）。
- **可选** `registry.test.ts`：断言 `findCommand('mycmd')` 与别名。
- **一般不改** `parse.test.ts`（除非改解析规则）。

测试风格与现有文件一致：`vitest`，`makeCtx()` mock `persist` / `newChat` 等。

### 4. 验证

```bash
npm test -- --run
```

全部通过后再汇报。

### 5. 手工验收（ChatPane 已接线，通常无需改）

打开项目 → 聊天输入 `/mycmd` → Enter：

- 不出现 user 消息里的 `/mycmd`（不进模型历史）
- assistant 展示 `run` 返回的 `message`
- Agent **loading** 或 **pending 写盘** 时应提示等待，命令不执行

仅当要改门控、占位符、或 `buildSlashContext` 缺字段时，才改 `src/components/workbench/ChatPane.vue`。

## 解析规则（`parse.ts`，默认勿动）

| 输入 | `commandName` | `args` |
|------|---------------|--------|
| `/help` | `help` | `''` |
| `/model foo` | `model` | `foo` |
| `hello` | — | 非斜杠，`runSlashCommand` 返回 `null`，走普通聊天 |
| `/` 或 `/   ` | — | `null`，ChatPane 提示暂无命令 |

命令名统一转**小写**匹配。

## 完成后输出

简短报告：

- 命令名、别名、行为说明
- 新建/修改的文件列表
- 测试文件与 `npm test` 结果
- 是否改动了 `ChatPane` / `types.ts`

## 不要做的事

- **不要**在 `electron/main/` 新建 `slash-ipc`（除非用户明确要求 Main 侧命令）。
- **不要**把斜杠行 push 进 `messages` 的 `role: 'user'`（不进模型）。
- **不要**在命令里直接 `import` Vue 组件；UI 用 `ctx` 回调或 `emit` 扩展。
- **不要**改 `run.ts` 分发逻辑来塞单个命令的特殊分支；逻辑写在 `<name>/index.ts`。
- 未要求时不要实现 `/help` typeahead、prompt 型命令（展开后再 `agentSend`）。

## 恢复内置命令示例

若需重新启用 `clear` / `help` / `new` / `model`，从 git 历史恢复对应 `src/slash-commands/<name>/index.ts` 并写入 `registry.ts` 的 `COMMANDS` 即可。

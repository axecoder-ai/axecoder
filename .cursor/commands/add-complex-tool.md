# 添加 Agent 复杂 Tool

为 WritCraft Agent 增加**复杂 tool**（非 Read/Edit/Write/Grep/Delete/Move 的基础文件操作）。复杂 tool 走 function calling，注册在 `electron/main/agent/tools-complex/`，与基础 tool 自动合并进 `AGENT_TOOLS`。

## 开始前

向用户确认（未提供则询问）：

1. **Tool 名称**（PascalCase，如 `ListDir`、`SearchWeb`）
2. **用途一句话**（给模型的 description）
3. **参数**（字段名、类型、是否必填）
4. **执行类型**
   - `immediate`：立刻返回字符串结果（只读、查询类）
   - `pending`：需用户确认后再执行（改文件/删文件类，对标 Edit/Write）
5. **是否依赖项目根、readCache、外部 API**

## 实现清单（按顺序）

### 1. 类型：`electron/main/agent/agent-types.ts`

在 `AgentComplexToolName` 联合类型中追加新名称（当前从 `never` 改为具体字面量，或往已有联合里加一项）：

```ts
export type AgentComplexToolName = 'YourTool' // | 'OtherTool'
```

若 tool 需要用户确认写操作，且 `PendingWritePublic['tool']` 未包含该名称，再扩展：

```ts
tool: 'Edit' | 'Write' | 'Delete' | 'Move' | 'YourTool'
```

（仅 pending 写类 tool 需要。）

### 2. Schema：`electron/main/agent/tools-complex/defs.ts`

在 `COMPLEX_AGENT_TOOLS` 数组追加一项，字段对齐 OpenAI function schema：

```ts
{
  name: 'YourTool',
  description: '...',
  parameters: {
    type: 'object',
    properties: { /* ... */ },
    required: ['...'],
  },
},
```

无需改 `agent-tool-defs.ts`：`AGENT_TOOLS` 已自动 `[...BASIC_AGENT_TOOLS, ...COMPLEX_AGENT_TOOLS]`。

### 3. 执行：`electron/main/agent/tools-complex/executor.ts`

在 `executeComplexAgentTool` 中按 `call.name` 分支实现。

- **参数解析**：用 `typeof args.x === 'string'` 等校验，非法参数返回 `kind: 'immediate'` 且 `ok: false`、`content` 以 `Error:` 开头。
- **immediate 成功示例**：

```ts
return {
  kind: 'immediate',
  content: resultText,
  log: { name: 'YourTool', summary: '简短摘要', ok: true },
}
```

- **pending**（需用户确认）：参考 `tool-executor.ts` 里 Edit/Write/Delete/Move，返回 `kind: 'pending'`，含 `pending.id`、`tool`、`filePath`、`summary`、`patchText`、`apply` 异步函数。

逻辑复杂时，可在 `tools-complex/` 下新建 `your-tool.ts`，由 `executor.ts` import，保持 `executor.ts` 只做分发。

**约束**

- 路径必须经 `resolvePathInProject(projectRoot, relativePath)`，禁止越出项目根。
- 不要新增 shell 型文件操作；复杂 IO 放 `agent-fs.ts` 或 `tools-complex/` 专用模块。
- 未识别的 `name` 继续 `return null`，交给基础 executor。

### 4. 系统提示（可选）

若 tool 有特殊用法，在 `agent-tool-defs.ts` 的 `AGENT_SYSTEM_PROMPT_BASE` 追加一条 bullet（一行即可）。

### 5. 单元测试

在 `tests/unittest/UT-agent-complex/`（无则创建）增加 `your-tool.test.ts`：

- 至少覆盖：参数非法、成功路径、（若有）权限/边界错误。
- 通过 `executeAgentTool` 或 `executeComplexAgentTool` 调用，与现有 `UT-agent-edit/tool-executor.test.ts` 风格一致。

### 6. 验证

```bash
npm test -- --run
```

全部通过后再汇报。

## 完成后输出

简短报告：

- Tool 名称与行为说明
- 修改的文件列表
- immediate / pending
- 测试文件与结果

## 不要做的事

- 不要把复杂 tool 写进 `BASIC_AGENT_TOOLS` 或 `tool-executor.ts` 的大段 `if (name === ...)`（基础 6 个除外）。
- 不要改 `chat-with-tools.ts` 的 tools 映射逻辑（已读 `AGENT_TOOLS`）。
- 未要求时不要改 UI、IPC 名称或 agent-loop 主流程。

# `/init` 斜杠命令：背景资料初始化 设计文档

> 依据：`/add-slash-command`、`.writcraft/background.json`（`plan-background-materials-proposal1.md`）  
> **范围：** `/init` 扫描项目、归类背景文件、汇总参数、写入 manifest；Main IPC + `src/utils/background-init.ts` + 单测  
> **不在范围：** PDF/Word 解析、AI 自动摘要参数、manifest 向导 UI、修改 `parse.ts` / `run.ts` 分发

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | `src/slash-commands/init/`、`registry.ts`；`src/utils/background-init.ts`；`electron/main/background-init.ts`；`fs:initBackground` IPC；`SlashContext.initBackground` |
| **约束** | 命令实现流水账；manifest `version: 1`；路径相对项目根；扫描排除 `node_modules`、`.git`、`dist`、`.writcraft/sessions` |
| **时间线（估）** | 约 0.5–1 人日：utils+单测 0.25d → Main IPC 0.25d → slash+接线 0.25d |

---

## 当前背景

- **现状：** `BackgroundPanel` 依赖用户手写 `.writcraft/background.json`；空态仅提示创建 manifest。
- **痛点：** 标书项目内「参数 / 招标 / 磋商 / 背景」文件分散在 `未来资料/` 等目录，手动维护 manifest 成本高。
- **已有能力：** `readBackgroundMaterials` 按 manifest 展开；`parseBackgroundManifest` 校验 schema；ripgrep `--files` 做 glob。

---

## 需求

### 功能需求

- **F1 扫描：** 在项目根用 ripgrep 列出 `md/txt/markdown/json`，按文件名与路径关键字归类：
  - `params`（参数）
  - `tender`（招标文件）
  - `negotiation`（磋商文件）
  - `background`（背景资料，含 `未来资料/`、`背景资料/` 目录下文件）
- **F2 参数汇总：** 将所有归入 `params` 的文本文件内容合并为 `.writcraft/参数汇总.md`（每文件一节 `## 来源: <相对路径>`）。
- **F3 写 manifest：** 生成/覆盖 `.writcraft/background.json`，四类 `categories`，每类 `paths` 为扫描到的相对路径（去重）；`params` 类首位包含 `参数汇总.md`（若已生成）。
- **F4 `/init`：** 斜杠命令调用 `ctx.initBackground()`，成功后在聊天区展示摘要（各类文件数、manifest 路径）；失败返回错误文案。
- **F5 门控：** 无 `projectRoot` 时失败；沿用 ChatPane 忙碌门控。

### 非功能需求

- 归类逻辑放在 `src/utils/background-init.ts`，Main 与单测共用。
- 不删除用户已有 manifest 外的文件；仅写入 `.writcraft/` 下两个文件。

---

## 设计决策

### 1. 扫描在 Main 执行

- **选择：** 新增 `fs:initBackground(projectRoot)`，复用 ripgrep `--files`（与 `background-materials.ts` 相同排除规则）。
- **理由：** 与现有 glob 能力一致；Renderer 不直接遍历万级文件。

### 2. 归类优先级

- **选择：** 单文件只归入一类：`params` > `tender` > `negotiation` > `background`（先匹配文件名/路径规则）。
- **理由：** manifest 每类独立列表，避免重复条目。

### 3. 参数「提取」

- **选择：** V1 为**全文合并**，不做表格字段解析。
- **理由：** 最小实现、可测；后续可增强结构化抽取。

---

## 技术设计

### 1. 归类规则（`classifyBackgroundRelativePath`）

| 类别 id | 匹配（路径或文件名，不区分大小写） |
|---------|-----------------------------------|
| `params` | 含 `参数` 或 `params` |
| `tender` | 含 `招标` |
| `negotiation` | 含 `磋商` |
| `background` | 含 `背景`、`未来资料/`、`背景资料/`、`reference/` |

扩展名须匹配 `AI_CONTEXT_EXT`（与背景资料一致）。

### 2. manifest 模板

```json
{
  "version": 1,
  "categories": [
    { "id": "params", "label": "参数", "paths": [".writcraft/参数汇总.md", "..."], "globs": [] },
    { "id": "tender", "label": "招标文件", "paths": [], "globs": [] },
    { "id": "negotiation", "label": "磋商文件", "paths": [], "globs": [] },
    { "id": "background", "label": "背景资料", "paths": [], "globs": [] }
  ]
}
```

### 3. IPC 返回

```ts
type InitBackgroundResult =
  | { ok: true; manifestPath: string; summaryPath?: string; counts: Record<string, number> }
  | { ok: false; error: string }
```

### 4. 文件变更

| 文件 | 操作 |
|------|------|
| `src/utils/background-init.ts` | 新建：归类、建 manifest、合并参数 |
| `electron/main/background-init.ts` | 新建：扫描+读写 |
| `electron/main/fs-ipc.ts` | 注册 `fs:initBackground` |
| `electron/preload/index.ts`、`src/types/writcraft.d.ts` | 暴露 API |
| `src/slash-commands/init/index.ts` | 命令实现 |
| `src/slash-commands/registry.ts` | 注册 |
| `src/slash-commands/types.ts`、`ChatPane.vue` | `initBackground` |
| `tests/unittest/UT-background-init/` | 新建 |
| `tests/unittest/UT-slash-commands/run.test.ts` | `/init` 用例 |

---

## 实施计划

1. **utils + 单测：** `classifyBackgroundRelativePath`、`buildManifestFromScan`、`mergeParameterContents`。
2. **Main IPC：** `initBackgroundMaterials` 扫描、读参、写 `.writcraft/参数汇总.md` 与 `background.json`。
3. **斜杠命令：** `/init` 注册与 `SlashContext` 接线。
4. **验收：** `npm test -- --run`；手工打开标书项目执行 `/init`，背景 Tab 可刷新见条目。

---

## 测试策略

### 单元测试

- 归类：参数.md → params；招标说明.md → tender；路径 `未来资料/x.md` → background。
- manifest：空扫描仍输出四类；paths 去重、相对路径。
- 合并：两文件内容带 `## 来源` 标题。

### 手工

- 有 `未来资料/参数.md` 的项目执行 `/init` → 生成 manifest + 汇总 → BackgroundPanel 刷新可见。

---

## 参考资料

- `docs/plans/plan-background-materials-proposal1.md`
- `docs/plans/plan-slash-commands-proposal1.md`
- `.cursor/commands/add-slash-command.md`

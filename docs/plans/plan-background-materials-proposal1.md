# 背景资料侧栏（提案 1 + layers 图标）设计文档

> 依据：`docs/proposals/proposal-background-materials.md` **提案 1**（项目 manifest + 背景资料面板）  
> **图标：** 采用 **layers（堆叠图层）** SVG，替换原 `scm` 槽位第三项 Tab  
> **范围：** `.writcraft/background.json`、Main 解析 IPC、`BackgroundPanel.vue`、侧栏 Tab 切换、聊天默认附带背景文件；**不**做侧栏 Markdown 预览、PDF/DOCX 内嵌、manifest 向导 UI、Agent system prompt 固定注入  
> **约束：** Renderer 不经 `fs`；路径一律 `isPathInsideRoot`；复用 `expandChatUserWithFiles` / `chat-file-context.ts` 字符上限  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | manifest 读写与 glob 展开；`BackgroundPanel`；`SidebarViewBar` `scm`→`background` + layers 图标；`App.vue` / `ChatPane.vue` 背景路径合并 |
| **不在范围** | 侧栏只读预览、PDF/Word 解析、「从文件夹生成 manifest」向导、背景写入 Agent system prompt、Git 面板迁到底部 Panel（V1 仅从侧栏移除，API 保留） |
| **约束** | 单根工作区；仅 Markdown/文本类文件作为 AI 上下文（非 md 条目可列出但标记「不支持带入 AI」）；勾选状态存 `localStorage` 按项目根路径 key |
| **时间线（估）** | **约 2–2.5 人日**：Main manifest 0.5d → 面板 UI 0.75d → 聊天接线 0.5d → Tab 图标 + 单测 + 验收 0.5d |

---

## 当前背景

- **现状：** 标书参考文件（如 `未来资料/参数.md`）与正文混在资源管理器树中；AI 聊天仅支持手动附件 + 当前编辑文件 `contextFilePath`（`App.vue:470` → `ChatPane.vue:30`）。
- **侧栏：** `SidebarViewBar.vue` 四 Tab：`explorer` / `search` / `scm` / `extensions`；第三项 `scm` 挂载 `ScmPanel.vue`（Git 状态，`App.vue:419`）。
- **已有能力：**
  - `chat:expandUserWithFiles` + `src/utils/chat-file-context.ts`（单文件 80k、总计 200k 字符）。
  - `fs:readFile`、`isPathInsideRoot`（`electron/main/fs-utils.ts`）。
  - ripgrep 已在 `fs-ipc.ts` 用于内容搜索，可复用 `--files --glob` 做 glob 展开。
- **痛点：** 招标文件、参数等「背景层」无独立入口；用户难以一眼看到哪些资料应作为 AI 参考；侧栏 `scm` 槽位与标书场景不匹配。

---

## 需求

### 功能需求（P0）

- **F1 manifest：** 项目根 `.writcraft/background.json` 声明分类与文件；缺失时面板展示空态 + 说明如何创建。
- **F2 解析：** Main 读取 manifest，将 `paths`（相对项目根）与 `globs` 展开为绝对路径列表；去重；标记缺失文件。
- **F3 背景 Tab：** `SidebarViewBar` 第三项改为 `background`，`title="背景资料"`，**layers** 图标（三层偏移矩形，16×16，`stroke-width: 1`，与现有 `view-icon` 一致）。
- **F4 背景面板：** `BackgroundPanel.vue` 按分类折叠展示条目；单击 `emit('open-file')` 在中栏打开；缺失项显示警告样式；顶部 ↻ 刷新。
- **F5 默认带入 AI：** 每条目 checkbox「带入聊天」；分类级「全选/全不选」；勾选路径持久化到 `localStorage`（key：`writcraft.background.include.<projectRoot>`）。
- **F6 聊天合并：** `ChatPane.send()` 合并顺序：`attachedFiles` + `contextFilePath`（若勾选）+ **背景勾选路径**（去重后）→ `expandChatUserWithFiles`。
- **F7 项目门控：** 未打开项目时面板显示「请先打开项目文件夹」（与 `SearchPanel` 一致）。
- **F8 移除侧栏 Git：** `App.vue` 不再挂载 `ScmPanel`；`gitStatus` IPC 与 `ScmPanel.vue` 文件保留，供后续底部 Panel 复用。

### 非功能需求

- manifest 解析 + 50 路径展开 &lt; 200ms（本地盘）。
- 背景文件过多时 UI 提示「部分文件可能因上下文上限被截断」（沿用 `chat-file-context` 行为，不在面板预读全文）。
- 面板切换用 `v-show`，与 `FileExplorer` 一致，避免重挂载闪烁。

### 不在本期（P2）

- 侧栏 Markdown 预览、PDF/DOCX 打开/预览。
- 「扫描 `未来资料/` 一键生成 manifest」向导。
- 背景资料写入 Agent system prompt 固定段。
- Git 迁到底部 `BottomPanel` 新 Tab（单独小 PR）。

---

## 设计决策

### 1. 数据源：项目 manifest（提案 1）

- **选择：** `.writcraft/background.json`，版本字段 `version: 1`。
- **理由：** 分类可控；正文与背景可显式区分；与 `.writcraft/sessions` 等同目录约定一致。
- **不采用：** 提案 2 纯约定目录扫描（零配置但分类弱）。

### 2. Tab 图标：layers（用户指定）

- **选择：** 三层堆叠矩形/平行四边形 SVG，表示「参考资料层」。
- **理由：** 与 manifest「分层分类」语义一致；区别于资源管理器「双页文件」图标。
- **不采用：** 提案 1 原文的 `book` 图标。

### 3. glob 展开在 Main 完成

- **选择：** `electron/main/background-materials.ts` 内：对 `paths` 直接 `path.join(root, rel)` 并 `access`；对 `globs` 调用 ripgrep `rg --files --glob <pattern>`（cwd=项目根，忽略规则与 `fs-ipc.ts` 树一致）。
- **理由：** Renderer 无 `fs`；rg 已在打包内；大目录性能可接受。
- **备选（不采用）：** Renderer 读整棵树再前端 match — 慢且重复逻辑。

### 4. 「带入聊天」状态存 localStorage，不写 manifest

- **选择：** 用户勾选存 `localStorage`，manifest 只描述「有哪些背景文件」。
- **理由：** 避免 git 脏 diff；个人偏好不应进仓库。
- **默认：** 首次加载某项目时，manifest 内全部条目默认勾选。

### 5. Git 侧栏槽位让位，功能暂不搬迁

- **选择：** V1 侧栏第三项 exclusively 给背景资料；Git 从 ActivityBar 消失。
- **理由：** 最小 diff；标书场景优先背景 Tab；`ScmPanel.vue` 不删，后续 0.5d 可挂 `BottomPanel`。
- **不采用：** 本 PR 同时改底部 Panel — 范围过大。

### 6. 非 Markdown 文件

- **选择：** 面板可列出 manifest 中的任意路径；仅 `.md` / `.txt` / `.json` 等文本扩展名允许勾选「带入 AI」；其余显示灰色 + tooltip「V1 不支持作为 AI 上下文」。
- **理由：** 与 `readFile` UTF-8 文本假设一致；PDF 留 P2。

---

## 技术设计

### 1. manifest Schema（`.writcraft/background.json`）

```json
{
  "version": 1,
  "categories": [
    {
      "id": "params",
      "label": "参数",
      "paths": ["未来资料/参数.md"],
      "globs": []
    },
    {
      "id": "tender",
      "label": "招标文件",
      "paths": [],
      "globs": ["**/招标*.md", "未来资料/*.md"]
    }
  ]
}
```

- `id`：英文 slug，面板 key。
- `label`：侧栏展示中文名。
- `paths`：相对项目根，正斜杠。
- `globs`：相对项目根的 glob（传给 rg `--glob`）；`paths` 与 `globs` 可并存，结果合并去重。

### 2. Main 返回类型（`src/types/writcraft.d.ts` 新增）

```ts
export type BackgroundMaterialEntry = {
  path: string           // 绝对路径
  relativePath: string   // 相对项目根
  exists: boolean
  aiContextAllowed: boolean  // 扩展名是否允许带入 AI
}

export type BackgroundMaterialCategory = {
  id: string
  label: string
  entries: BackgroundMaterialEntry[]
}

export type BackgroundMaterialsResult =
  | { ok: true; categories: BackgroundMaterialCategory[]; manifestPath: string }
  | { ok: false; error: string; code: 'NO_PROJECT' | 'MANIFEST_MISSING' | 'MANIFEST_INVALID' }
```

IPC：`fs:readBackgroundMaterials(projectRoot: string) → BackgroundMaterialsResult`

### 3. Main 解析流水账（`electron/main/background-materials.ts`）

```ts
// 伪代码，实现时用流水账，少抽象
// 1. assert isPathInsideRoot(projectRoot)
// 2. manifestPath = join(projectRoot, '.writcraft/background.json')
// 3. 无文件 → { ok: false, code: 'MANIFEST_MISSING' }
// 4. JSON.parse + 校验 version/categories 数组
// 5. 对每个 category：
//    - 遍历 paths → absPath → exists?
//    - 遍历 globs → runRipgrepFiles(root, glob) → 每条 exists 默认 true
//    - Map 去重 absPath
//    - aiContextAllowed = /\.(md|txt|markdown|json)$/i.test(name)
// 6. 返回 categories
```

### 4. `BackgroundPanel.vue` 要点

- Props：`visible`、`projectRoot`。
- Emits：`open-file(path: string)`。
- 状态：`categories`、`loading`、`error`、`included: Set<string>`（从 localStorage  hydrate）。
- `watch([visible, projectRoot])` → `load()` 调 `window.writcraft.readBackgroundMaterials`。
- UI：与 `ScmPanel.vue` / `SearchPanel.vue` 共用 `.sidebar-panel` 样式模式；分类 `<details open>`；条目行 = checkbox + 相对路径 link；缺失加 `.missing` 样式。

### 5. layers 图标（`SidebarViewBar.vue`）

```svg
<!-- 三层偏移矩形，示意 -->
<path d="M2 4h8v8H2z" stroke="currentColor" />
<path d="M4 2h8v8H4z" stroke="currentColor" />
<path d="M6 6h8v8H6z" stroke="currentColor" />
```

（实现时微调坐标，保证 16×16 viewBox 内视觉平衡。）

### 6. `ChatPane.vue` 合并路径

```ts
// send() 内拼 filePaths 时（现有 attached + context 之后）：
const bgPaths = props.backgroundContextPaths ?? []
for (const p of bgPaths) {
  if (!filePaths.includes(p)) filePaths.push(p)
}
```

`App.vue`：`backgroundContextPaths` computed ← `BackgroundPanel` 通过 ref 暴露 `includedPaths` 或 emit `update:includedPaths`。

### 7. 数据流

```
.writingcraft/background.json
  → Main readBackgroundMaterials
  → BackgroundPanel 展示 + localStorage 勾选
  → App backgroundContextPaths
  → ChatPane.send → expandChatUserWithFiles → aiChat / agentSend
```

### 8. 文件变更

**新建**

- `electron/main/background-materials.ts` — manifest 读解析 + glob
- `src/components/workbench/BackgroundPanel.vue` — 侧栏 UI
- `src/utils/background-materials.ts` — localStorage key、`AI_CONTEXT_EXT` 常量（与 Main 扩展名列表保持一致注释）
- `tests/unittest/UT-background-materials/background-materials.test.ts` — manifest 校验、去重、扩展名判断（Main 逻辑可抽纯函数到 `src/utils` 或 `electron/main` 同测）

**修改**

- `electron/main/fs-ipc.ts` — 注册 `fs:readBackgroundMaterials`
- `electron/preload/index.ts` — `readBackgroundMaterials`
- `src/types/writcraft.d.ts` — 类型 + API
- `src/components/workbench/SidebarViewBar.vue` — `scm`→`background`，layers SVG
- `src/App.vue` — `showBackground()`；挂 `BackgroundPanel`；移除 `ScmPanel`；传 `backgroundContextPaths` 给 `ChatPane`
- `src/components/workbench/ChatPane.vue` — prop `backgroundContextPaths`；`send()` 合并

**不改（V1）**

- `ScmPanel.vue`（保留文件）
- `BottomPanel.vue`
- Agent system prompt 相关 Main 代码

---

## 实施计划

### 阶段一：Main manifest + IPC（约 0.5 人日）

- 建 `background-materials.ts`：读 JSON、校验、paths 解析、rg glob 展开、去重。
- `fs-ipc.ts` 注册 handler；preload + `writcraft.d.ts` 暴露。
- 纯函数单测：非法 JSON、空 categories、paths+globs 去重、扩展名判断。

### 阶段二：侧栏 Tab + BackgroundPanel（约 0.75 人日）

- `SidebarViewBar`：`background` id、layers 图标、`title="背景资料"`。
- `BackgroundPanel.vue`：加载/空态/错误态、分类列表、checkbox、刷新、open-file。
- `localStorage` 勾选读写；默认全选。

### 阶段三：App + Chat 接线（约 0.5 人日）

- `App.vue`：`showBackground`、替换 `ScmPanel`、连接 `backgroundContextPaths`。
- `ChatPane.vue`：合并背景路径到 `expandChatUserWithFiles`。
- 打开项目 / 切换 Tab 时面板自动 refresh。

### 阶段四：验收与示例 manifest（约 0.5 人日）

- 在测试项目（或文档）提供示例 `.writcraft/background.json` 片段。
- 手工清单（见下）；修复样式与边界 case。

---

## 测试策略

### 单元测试

| 用例 | 预期 |
|------|------|
| 合法 manifest 两分类 paths 重叠 | 条目去重 |
| glob `**/参数*.md` | 返回匹配绝对路径 |
| 扩展名 `.pdf` | `aiContextAllowed: false` |
| 缺失 `paths` 项 | `exists: false` 仍展示 |
| 非法 JSON / 缺 `categories` | `MANIFEST_INVALID` |

### 手工验收

| 场景 | 预期 |
|------|------|
| 无 manifest | 空态文案 + 如何创建 |
| 有 manifest，切背景 Tab | 分类与文件列表正确 |
| 点击条目 | 中栏打开对应文件 |
| 勾选背景 + 发聊天 | user 消息含背景文件块 |
| 取消勾选 | 发送不再附带该文件 |
| 侧栏第三 Tab | layers 图标，非 Git 分支图标 |
| 未打开项目 | 「请先打开项目」 |
| 背景文件总大小超限 | 发送成功但内容截断（与现附件一致） |

---

## 可观测性

- V1 无专门指标。
- Main 解析失败时 `console.warn('[background]', code, error)` 即可。

---

## 安全考量

- 所有 manifest 内路径展开后必须 `isPathInsideRoot(projectRoot, absPath)`，拒绝 `../` 逃逸。
- 仅 `readFile` 已有权限范围内的文件；不向 Renderer 暴露 manifest 外任意读。
- manifest 本身在项目目录内，随项目 git 管理；不含密钥。

---

## 发布策略

1. 合并 PR 后，现有项目需手动添加 `.writcraft/background.json` 才出现条目（空态引导）。
2. 无需数据迁移；无 Electron 打包配置变更（除非 rg 调用方式新增参数需验证 win32）。

---

## 后续考虑

- Git 面板挂 `BottomPanel` 第四 Tab `scm`。
- 「从 `未来资料/` 生成 manifest」命令或设置页按钮。
- 侧栏选中条目 Markdown 只读预览（提案 2 能力）。
- PDF 转文本后再允许带入 AI。
- manifest `version: 2` 支持条目级 `description`、只读锁定标记。

---

## 参考资料

- `docs/proposals/proposal-background-materials.md` — 提案全文
- `docs/research/research-ide-basics.md` — §1 架构、§7 关键文件
- `src/utils/chat-file-context.ts` — 附件拼消息与字符上限
- `src/components/workbench/SidebarViewBar.vue` — 侧栏 Tab 结构
- `src/components/workbench/ScmPanel.vue` — 面板样式参考

---

## 文档信息

- **路径：** `docs/plans/plan-background-materials-proposal1.md`
- **关联提案：** `docs/proposals/proposal-background-materials.md` 提案 1 + layers 图标
- **状态：** 待评审后实施

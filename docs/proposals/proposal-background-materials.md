# 解决方案提案：背景资料侧栏

---

## 解决方案提案

**上下文：**
- **请求：** 为标书撰写场景增加「背景资料」能力——将招标文件、参数表等参考信息整合展示，并在左侧 `SidebarViewBar` 新增/替换一个 Tab（如图标注位置，当前为 SCM 分支图标）集中呈现；Tab 图标需更贴合「背景资料」语义（如书本、资料夹、图层）。
- **调研来源：**
  - `docs/research/research-ide-basics.md` — §1 架构（Main `fs:*` / Renderer `workbench/*`）、§3.4 壳 UI（ActivityBar 占位、`SidebarViewBar` 四视图切换）、§7 关键文件索引（`App.vue`、`FileExplorer.vue`、`SidebarViewBar.vue`）。
  - `docs/proposals/proposal-bid-editor.md` — 已选定 Electron + Vue 3 + `electron-vite`；Renderer 不经 `fs`，单根工作区。
  - `docs/proposals/proposal-chat-file-agent.md` — 聊天侧已有只读文件上下文 `chat:expandUserWithFiles`；Agent 可读项目内文件。
  - `src/components/workbench/SidebarViewBar.vue` — 现有四 Tab：`explorer` / `search` / `scm` / `extensions`（`:2-7`）。
  - `src/App.vue` — `activeActivity` 切换侧栏面板（`:34`、`:169-172`、`:396-420`）；`ScmPanel` 占用 `scm` 槽位。
  - `src/utils/chat-file-context.ts` — 附件拼进 user 消息（`buildUserMessageWithFiles`，`:38-80`）；单文件 80k、总计 200k 字符上限。
- **调研缺口：** 无专门 `research-background-materials.md`；项目内「背景资料」目录命名、是否需 PDF/Word 解析、与 Agent 系统提示的注入策略尚未产品确认。实现前建议对真实标书仓库（如截图中 `BIAOSHU/未来资料/`）做一次目录约定访谈。

---

**提案 1 – 项目 manifest + 背景资料面板（推荐，契合度最高）**

- **概述：** 在项目根增加 `.writcraft/background.json`（或 `background.yml`）声明背景资料分类与文件路径/glob；将 `SidebarViewBar` 的 `scm` 槽位改为 `background`（Git 面板可迁至底部 Panel 或保留为次级入口），新增 `BackgroundPanel.vue` 按分类展示条目，点击在中栏打开；可选「一键全部纳入聊天上下文」。Tab 图标采用 **打开的书本** 或 **资料夹+文档**（VS Code Codicon `book` / `library` 风格 SVG）。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `.writcraft/background.json`（项目内，用户可编辑） | 示例：`{ "categories": [{ "id": "tender", "label": "招标文件", "paths": ["未来资料/参数.md"] }, { "id": "params", "label": "参数", "globs": ["**/参数*.md"] }] }` |
  | `electron/main/fs-ipc.ts` | 新增 `fs:readBackgroundManifest`（读 manifest + 解析 glob 为绝对路径列表，复用现有 `readTree` / ripgrep glob 能力） |
  | `electron/preload/index.ts` + `src/types/writcraft.d.ts` | 暴露 `getBackgroundMaterials(projectRoot)` |
  | `src/components/workbench/SidebarViewBar.vue` | `scm` → `background`，替换 SVG 图标与 `title="背景资料"` |
  | `src/components/workbench/BackgroundPanel.vue`（新建） | 分类折叠列表、缺失文件警告、单击 `emit('open-file')`、勾选「默认带入 AI」 |
  | `src/App.vue` | `showBackground()`；挂载 `BackgroundPanel`；`backgroundContextPaths` ref 传给 `ChatPane` |
  | `src/components/workbench/ChatPane.vue` | 发送前合并 `backgroundContextPaths` 与现有 `attachedFiles` / `contextFilePath`（经 `expandChatUserWithFiles`） |
  | `src/utils/background-materials.ts`（新建） | manifest 校验、路径去重、与 `isUnderProject` 对齐 |
- **权衡：**
  - **收益：** 显式配置，分类清晰；同一项目可精确控制哪些文件算「背景」而非正文；与现有 IPC / 聊天附件链路复用度高；图标与语义一致。
  - **风险：** 用户需维护 manifest（可提供「从文件夹生成 manifest」向导）；glob 解析需处理大目录性能；背景文件过多时仍受 `CHAT_FILES_TOTAL_MAX_CHARS` 截断。
  - **契合度：** 最高 — 不改变磁盘布局，只增视图与配置；符合标书场景「参数 / 招标 / 技术参考」多类资料。
- **验证：**
  - **手工：** 打开 `BIAOSHU` → 切到背景资料 Tab → 见「参数」「招标」分组 → 点击条目打开 `参数.md` → 新建对话发送消息，确认 user 消息含背景文件块 → 修改 manifest 后 ↻ 刷新列表。
  - **单测：** `background-materials.ts` 对 manifest 解析、glob 展开、重复路径去重；超限截断与 `chat-file-context` 一致。
  - **指标：** manifest 解析 + 50 个路径展开 &lt; 200ms；面板切换无闪烁（`v-show` 与 `FileExplorer` 一致）。
- **待解决问题：**
  - manifest 是否随项目 git 提交（建议 `.writcraft/background.json` 默认提交，密钥类文件仍 `.gitignore`）。
  - 非 Markdown（PDF/DOCX）是否 V1 仅显示「用系统打开」链接，不做内嵌预览。
  - Git（原 `scm`）迁往何处：底部 `BottomPanel` 第二 Tab vs 命令面板 `/git`。
  - 背景资料是否写入 Agent system prompt 固定段（与每轮 user 附件二选一或并存）。

---

**提案 2 – 约定目录零配置扫描 + 侧栏预览**

- **概述：** 不引入 manifest，按**约定文件夹名**自动发现背景资料：`背景资料/`、`未来资料/`、`reference/` 等（可配置默认列表于 `electron-store`）；`BackgroundPanel` 展示扫描结果树形列表，支持侧栏内 Markdown 只读预览（`markdown-it`，不占用中栏 Tab）；勾选状态存 `userData/<projectHash>/background-selection.json`。将 `SidebarViewBar` 第三项改为 `background`，图标用 **堆叠图层**（layers）表示「参考资料层」。
- **关键变更：**
  | 模块 | 变更 |
  |------|------|
  | `electron/main/background-scan.ts`（新建） | 打开项目时扫描约定目录名；返回 `{ folder, files: FileNode[] }[]` |
  | `fs-ipc.ts` | `fs:scanBackgroundDirs(projectRoot, dirNames[])` |
  | `BackgroundPanel.vue` | 左：扫描树；右：选中文件预览区（只读）；底部「全部加入上下文」 |
  | `SidebarViewBar.vue` | 同提案 1 替换 `scm` 槽位与图标 |
  | `SettingsPanel.vue` | 可选：自定义「背景目录名」列表 |
  | `ChatPane.vue` | 读取 `background-selection.json` 中勾选路径作为默认附件 |
- **权衡：**
  - **收益：** 零配置上手快，与截图现有 `未来资料/` 结构天然契合；侧栏预览减少中栏 Tab 切换；无需用户学 JSON schema。
  - **风险：** 约定目录歧义（正文与背景混放时无法区分）；多根或深层嵌套时扫描成本；预览与中栏 Monaco 双份渲染，大文件内存占用；分类粒度弱于 manifest。
  - **契合度：** 中高 — 适合 V1 快速验证 UX；长期可能仍需升级到提案 1 的 manifest。
- **验证：**
  - **手工：** 仅建 `未来资料/参数.md` 无配置文件 → 背景 Tab 自动出现该文件 → 侧栏预览与编辑器内容一致 → 勾选后聊天附带内容。
  - **边界：** 空项目、无约定目录时展示空态 +「创建背景资料文件夹」按钮；目录名大小写/中文路径。
  - **指标：** 单根 500 文件项目扫描 &lt; 500ms（可缓存至 `project-opened`）。
- **待解决问题：**
  - 默认约定目录列表是否内置中文名（`背景资料`、`未来资料`、`招标文件`）。
  - 侧栏预览是否与 `EditorPane` 预览组件抽公共 `MarkdownPreview.vue`。
  - 扫描缓存失效策略（`chokidar` 已有规划，`research-ide-basics.md` §4 P1-9）。
  - 从提案 2 迁移到提案 1 时，是否提供「导出为 background.json」工具。

---

## 方案对比摘要

| 维度 | 提案 1（manifest） | 提案 2（约定目录扫描） |
|------|-------------------|------------------------|
| 上手成本 | 需编辑 manifest | 建文件夹即可 |
| 分类与精确控制 | 强 | 弱（按文件夹） |
| 与 AI 上下文集成 | 显式 paths + 可选默认注入 | 勾选持久化 |
| 实现工作量 | 中（manifest 解析 + 面板） | 中（扫描 + 预览 UI 略重） |
| 长期扩展 | 易加 PDF 元数据、版本标签 | 需补 manifest 或标签 |
| Tab 图标建议 | `book` / 书本 | `layers` / 图层 |

## 共同实施要点（两方案均适用）

1. **Tab 位置：** 建议替换 `SidebarViewBar` 第三项 `scm`（`SidebarViewBar.vue:4-5`），与截图箭头位置一致；Git 功能若仍需保留，可移至底部 Panel 或命令面板，避免 ActivityBar 超过 5 项。
2. **图标：** 16×16 SVG，`stroke-width: 1`，与现有 `view-icon` 风格一致；`title="背景资料"`，`aria-label` 同步。
3. **打开行为：** 面板条目 `emit('open-file', path)` 复用 `App.vue` `onOpenFile`（`:405`），不重复实现读写。
4. **AI 联动：** 复用 `chat-file-context.ts` 与 `expandChatUserWithFiles`；背景文件计入 `CHAT_FILES_TOTAL_MAX_CHARS`，UI 需提示截断。
5. **空态：** 未打开项目时面板显示「请先打开项目文件夹」，与 `SearchPanel` 一致。

## 调研缺口与后续动作

1. **产品确认：** 背景资料是否包含 PDF/Word；是否必须自动注入每条聊天；正文目录（如 `技术方案.md`）是否应排除在背景之外。
2. **Spike（0.5 天）：** 在真实 `BIAOSHU` 仓库试两种方案的信息架构，确定默认分类名与 manifest 最小 schema。
3. **可选补调研：** `/research-codebase` 产出 `docs/research/research-background-materials.md`，覆盖 manifest 版本迁移与 Agent system prompt 注入点。

---

## 文档信息

- **路径：** `docs/proposals/proposal-background-materials.md`
- **关联需求：** 背景资料 Tab 整合招标/参数等参考信息
- **状态：** 待选型（建议优先 **提案 1**，提案 2 作 V1 快速原型或 manifest 缺省生成器）

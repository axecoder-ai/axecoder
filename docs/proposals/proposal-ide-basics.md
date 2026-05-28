# 解决方案提案：通用 IDE 基础能力补齐

---

## 解决方案提案

**上下文：**
- **请求：** 对标通用 IDE，补齐 WritCraft 尚缺的基础能力——重点是（1）文件正删改查与会话管理、（2）常用快捷键、（3）其余基本盘（多标签、搜索、未保存提示、状态栏、设置等）；**目标为全部实现**，可分阶段交付。
- **调研来源：** `docs/research/research-ide-basics.md`（§3 已实现矩阵、§4 P0–P2 缺口、§5 数据流、§8 实施顺序）；关键代码：`electron/main/fs-ipc.ts`、`src/App.vue:38-69`、`src/components/workbench/FileExplorer.vue`、`EditorPane.vue:23-28`、`electron/main/index.ts:67-105`。

**当前结论（调研摘要）：**
- **文件 CRUD（磁盘层）** 已基本具备：新建/夹、重命名、删、复制/移动、读、写（`writcraft.d.ts` 全量 API）。
- **缺口在「编辑器会话层」**：仅单文件 `activeFilePath`（`App.vue`），无多标签、无 dirty、无另存为/关闭；保存仅为 400ms 防抖隐式写盘。
- **快捷键** 仅有 ⌘O 与系统编辑 role，无 ⌘S、⌘W、文件树快捷键、命令面板。
- **其余**：搜索 Activity 无面板、状态栏假数据、OUTLINE/Git/设置为占位 UI。

---

**提案 1 – 在现有 Vue 工作台上线性增量（推荐，契合度最高）**

- **概述：** 不引入新框架层，在 `App.vue` 用 `ref`/`computed` 维护 `openFiles[]` 与 `dirty` 集合；扩展 `fs-ipc` 增加 `saveAs`、`openFile`；在 `electron/main/index.ts` 补全文件菜单与 accelerator；`FileExplorer` / `EditorPane` 分别接树快捷键与可关闭标签。搜索用 Main `child_process` + `@vscode/ripgrep` 新 IPC `fs:search`，侧栏新增 `SearchPanel.vue`。按 `research-ide-basics.md` §8 分 4 个里程碑交付，**全部 P0+P1 纳入 V1**，P2 单列 backlog。
- **关键变更：**
  - **Main：** `fs:saveAs`、`fs:openFile`；`fs:search`（glob + content）；可选 `fs:watch`（chokidar）；菜单增加 Save / Save As / New File / Close Tab / Find in Files；`ipcMain.on('editor:save')` 等由菜单 `click` 发 Renderer。
  - **Preload / 类型：** 扩展 `WritcraftFs`；`onMenuAction` 统一订阅。
  - **App.vue：** `openFiles: { path, name, content, dirty }[]`、`activePath`；`saveFile`/`closeTab`/`confirmDirty`；保留可关闭的自动保存（dirty 时 debounce）。
  - **EditorPane.vue：** 多 tab UI + × 关闭 + 未保存圆点；向 Monaco 暴露 `getEditor()` 供光标。
  - **FileExplorer.vue：** 全局 `keydown`（树聚焦时）绑定 Delete/F2/⌘C/V/N；粘贴冲突弹窗（替换/自动重命名）。
  - **SearchPanel.vue + ActivityBar：** `search` 不再复用 `FileExplorer`。
  - **StatusBar.vue：** 接 Monaco 光标、保存中/已保存、真实语言。
  - **Settings（轻量）：** `electron-store` 存 autoSave、fontSize；`TitleBar` 设置弹层。
- **权衡：**
  - **收益：** 改动面清晰、与现有 `FileExplorer` CRUD 一致；团队已熟悉 Vue 3；最快补齐用户列的三类需求。
  - **风险：** `App.vue` 状态膨胀，后期需抽 `useWorkbench.ts` composable（仍可不引 Pinia）；多标签与外部 chokidar 竞态需单测「保存 vs 外部修改」。
  - **契合度：** 最高 — 直接补 §4 P0/P1，不动已选 electron-vite 架构。
- **验证：**
  - **手工清单：** 同时打开 3 个 md → 切换 tab → 改 A 不保存切 B → 提示；⌘S 落盘且圆点消失；另存为到新路径；树 F2 重命名已打开文件路径同步；⌘⇧F 搜索跳转行；关闭项目前 dirty 确认。
  - **可选自动化：** 临时目录 fixture + 调用 `fs:*` handler 测 rename/copy 冲突；Playwright 录一条多标签路径。
  - **指标：** ⌘S 保存反馈 &lt; 100ms（本地盘）；千行 md 打开 &lt; 500ms；grep 1 万文件 &lt; 3s。
- **待解决问题：**
  - 自动保存与显式保存并存时的 UX 文案（「已自动保存」vs 圆点）。
  - ripgrep 二进制打包体积 vs 依赖系统 `rg`。
  - Windows/Linux 菜单 accelerator 与 `TitleBar` 隐藏标题栏的快捷键冲突。
  - P2（命令面板、Git、终端）是否划入同一 epic 还是独立 `proposal-*`。

---

**提案 2 – Main 文档会话服务 + Renderer 快捷键注册表（架构先行）**

- **概述：** 在 Main 新增 `DocumentService`（内存或 LRU 缓存已打开文件元数据、diskRev、dirty 与保存队列）与 `KeybindingService`（JSON 配置 + 默认表）；Renderer 仅渲染与发 `doc:*` / `kb:*` IPC。文件树 CRUD 仍走 `fs:*`，但「打开/保存/关闭/另存为」统一走 `doc:open`、`doc:save`、`doc:close`。适合坚持「全部实现」且预期后续 AI diff、协同、插件时减少返工。
- **关键变更：**
  - **Main `services/document.ts`：** 维护 `Map<path, { content, dirty, mtime }>`；`save` 串行队列避免并发写；`before-quit` 统一 dirty 检查；`doc:saveAs` 封装 dialog。
  - **Main `services/keybindings.ts`：** 默认绑定表（VS Code 常用子集）；`globalShortcut` 仅用于无焦点命令，其余 `Menu` + Renderer `monaco.editor.addCommand` 分发。
  - **Main `services/search.ts`：** 从提案 1 抽离 ripgrep，结果带 `line/col` 供 `revealLineInCenter`。
  - **Preload：** 命名空间 `writcraft.doc` / `writcraft.fs` / `writcraft.search`，避免单对象膨胀。
  - **Renderer：** `WorkbenchShell.vue` 变薄；`TabStrip`、`Explorer`、`Search` 为展示组件；快捷键从 Main 推送 `kb:execute` 事件。
  - **配置：** `userData/keybindings.json`、`settings.json` 可覆盖默认。
- **权衡：**
  - **收益：** 边界清晰，易测（DocumentService 单测）；快捷键与菜单单一数据源；为 V2 插件/AI patch 预留。
  - **风险：** V1 工期比提案 1 多约 30–50%；若过度设计 LRU/协同未用上则浪费；Renderer 与 Main 双份「当前文件」需严格同步协议。
  - **契合度：** 中高 — 功能可全覆盖，但短期交付慢于提案 1。
- **验证：**
  - **单元：** DocumentService 对并发 `save`、`rename` 后路径更新、dirty 关闭拒绝；KeybindingService 解析冲突。
  - **契约：** zod/typed IPC 表与 `research` §2 合并为一张总表。
  - **E2E：** 与提案 1 相同手工清单 + 断网/只读目录错误码。
- **待解决问题：**
  - 大文件是否由 Main 持内容还是仍 Renderer 持 Monaco model（建议 Renderer 持内容，Main 仅元数据 + 持久化，与 Monaco 官方一致）。
  - 是否 V1 就上可编辑 `keybindings.json` UI，还是仅内置表。
  - 从提案 1 迁移路径：先抽 `doc:*` 再迁 `App.vue` 状态，还是一次性重写工作台。

---

## 方案对比摘要

| 维度 | 提案 1（Vue 增量） | 提案 2（Main 服务化） |
|------|-------------------|----------------------|
| 交付速度 | 快 | 中等偏慢 |
| 覆盖「统统实现」 | P0+P1 一期；P2 二期 | 一期可含更多 P2 底座 |
| 与现有代码契合 | 直接改 `App.vue` / `fs-ipc` | 需新建 services 层 |
| 可测试性 | 中（偏 E2E） | 高（Main 单测） |
| 长期扩展 | 状态集中后需重构 | 扩展成本较低 |

**建议：** 采用 **提案 1** 完成用户关心的文件会话、快捷键、搜索、状态栏与设置；在 `electron/main/services/` **预留空目录**，`doc:save` 等 handler 先写在 `fs-ipc.ts` 旁，待多标签稳定后再迁入提案 2 形态（与 `proposal-bid-editor.md` 对提案 2 的渐进迁移一致）。

---

## 功能清单：还差什么（回答用户三问）

### （1）文件基本的增删改查 — 对照

| 操作 | 磁盘/树 | 编辑器会话 | 待做 |
|------|---------|------------|------|
| 增（新建文件/夹） | ✅ | — | 可选 ⌘N 快捷键 |
| 删 | ✅ | — | 删除已打开 tab 时同步关闭 |
| 改（重命名） | ✅ | ⚠️ | 多标签时更新 path 键 |
| 查（打开/读） | ✅ | ⚠️ 单文件 | 多文件、最近文件 |
| 存 | ✅ IPC | ⚠️ 仅自动 | ⌘S、失败提示、另存为 |
| 关闭 | ❌ | ❌ | ⌘W、dirty 确认 |
| 复制/移动 | ✅ | — | 冲突处理 UI |

### （2）常用快捷键 — 待实现（建议默认）

| 快捷键 | 作用 |
|--------|------|
| ⌘S | 保存当前 |
| ⌘⇧S | 另存为 |
| ⌘W | 关闭当前标签 |
| ⌘N | 新建文件（项目根或选中目录） |
| ⌘O | 已有：打开项目 |
| ⌘⇧F | 项目中查找 |
| ⌘F / ⌘G | 编辑器内查找/下一个（Monaco，需挂菜单） |
| F2 | 重命名（树聚焦） |
| Delete | 删除（树聚焦） |
| ⌘C / ⌘V | 树内复制粘贴（已有菜单，补键盘） |
| ⌘⇧P | 命令面板（P2） |

### （3）其它通用 IDE 基本能力

| 类别 | 项 | 优先级 |
|------|-----|--------|
| 编辑 | 多标签、未保存标记、切换前确认 | P0 |
| 导航 | 项目搜索面板、最近文件 | P0/P1 |
| 反馈 | 状态栏行列、保存状态、错误 toast | P1 |
| 可靠性 | 外部文件变更提示、粘贴冲突 | P1 |
| 偏好 | 设置（自动保存、字体、主题） | P1 |
| 占位需落地或降级 | OUTLINE（标题大纲）、Git、终端、命令面板、分屏、拖放 | P2 |

---

## 调研缺口与后续动作

1. **已补：** `docs/research/research-ide-basics.md`（本提案依据）。
2. **实现前 spike（可选 1 天）：** `@vscode/ripgrep` 在 electron-builder 中的路径；Monaco `revealLineInCenter` 与 Search 结果联动。
3. **产品确认：** 自动保存默认开还是关；关闭窗口时是否「全部保存」第三按钮。

---

## 文档信息

- **路径：** `docs/proposals/proposal-ide-basics.md`
- **状态：** 待选定方案（建议提案 1）后按 §8 里程碑排期实现

# 通用 IDE 基础能力（提案 1）设计文档

> 依据：`docs/proposals/proposal-ide-basics.md` **提案 1**  
> 调研：`docs/research/research-ide-basics.md`  
> **范围：** 在现有 Electron + Vue 3 工作台上线性增量实现 P0+P1；**不**引入 Pinia、**不**重构为 Main DocumentService（提案 2）；P2（命令面板、Git、终端等）仅列入 backlog。  
> **约束：** Renderer 不得直接 `fs`；沿用 `window.writcraft` + `fs:*` IPC；不改动 Chat/Agents 业务逻辑。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | 多标签会话、dirty/保存、另存为/打开单文件、菜单与树快捷键、项目搜索、状态栏、轻量设置、粘贴冲突、最近文件、文件监听 |
| **不在范围** | AI 聊天联动、导出、插件、命令面板、Git/终端、分屏、工作区多根 |
| **约束** | 单根文件夹项目；UTF-8 文本；保持现有 `FileExplorer` CRUD 行为；`electron/main/services/` 仅预留空目录 |
| **时间线（估）** | 阶段一 1d → 阶段二 1d → 阶段三 1.5d → 阶段四 1d，合计 **约 4.5 人日** |

---

## 当前背景

- **系统：** WritCraft 桌面标书编辑器；`electron-vite` 三进程（main / preload / renderer）。
- **关键组件：**
  - `electron/main/fs-ipc.ts` — 文件树与读写 IPC（CRUD 已基本齐全）
  - `electron/main/index.ts` — 应用菜单（仅 ⌘O + 系统编辑 role）
  - `src/App.vue` — 单 `activeFilePath` + 400ms 防抖 `writeFile`
  - `src/components/workbench/FileExplorer.vue` — 树 CRUD + 右键
  - `src/components/workbench/EditorPane.vue` — 静态单 tab 壳
- **痛点：** 磁盘层 CRUD 已有，**编辑器会话层**缺多标签、dirty、显式保存；搜索 Activity 无面板；快捷键与状态栏大量占位。

---

## 需求

### 功能需求

**P0（必须先做）**

- **F1 多标签：** `openFiles[]` + `activePath`；点击 tab 切换；× 关闭；圆点表示 dirty。
- **F2 保存：** ⌘S / 菜单 Save；`writeFile` 成功清除 dirty；失败 toast；与可配置自动保存并存（默认开启，400ms debounce）。
- **F3 未保存保护：** 关闭 tab、切换 tab（可选）、`before-quit` 时 dirty 确认（放弃/取消/保存）。
- **F4 另存为 / 打开单文件：** `fs:saveAs`、`fs:openFile` + dialog；另存后更新 tab path。
- **F5 树与会话联动：** 删除/重命名已打开文件 → 关闭或更新 tab path；新建 ⌘N 快捷键。
- **F6 项目搜索：** `SearchPanel.vue`；`fs:search`（ripgrep）；⌘⇧F；点击结果打开并 `revealLineInCenter`。
- **F7 粘贴冲突：** `fs:copy`/`move` 目标存在时 UI 选择「跳过 / 自动重命名 / 替换」。

**P1（同一 epic，阶段三/四）**

- **F8 快捷键：** 文件树 F2/Delete/⌘C/V；菜单 Close Tab ⌘W、Save As ⌘⇧S；编辑 Find 挂菜单（Monaco 内置）。
- **F9 状态栏：** 真实行列（Monaco 光标）、保存状态、语言。
- **F10 最近文件：** `userData/recent-files.json`，最多 20 条。
- **F11 外部变更：** `chokidar` 监听项目根 → 刷新树；已打开文件变更提示「重新加载 / 保留」。
- **F12 设置：** `electron-store` — `autoSave`、`autoSaveDelay`、`fontSize`；`TitleBar` 设置弹层。

**P2（backlog，本期不做）**

- 命令面板、OUTLINE 真实现、Git、终端、分屏、拖放、树多选、主题切换。

### 非功能需求

- 千行 `.md` 打开 &lt; 500ms；⌘S 本地保存感知 &lt; 100ms。
- grep 万级文件目录 &lt; 3s（`@vscode/ripgrep`，忽略规则与树一致）。
- 不新增 npm 状态管理库；`App.vue` 逻辑过多时抽 `src/composables/useWorkbench.ts`（单文件 composable）。

---

## 设计决策

### 1. 会话状态放在 Renderer（`App.vue`），不建 Main DocumentService

- **选择：** `openFiles: { path, name, content, dirty }[]` 由 Vue `ref` 管理；Main 只做 IO 与 dialog。
- **理由：** 与提案 1、现有架构一致；Monaco model 天然在 Renderer；交付最快。
- **取舍：** `App.vue` 变厚；后续可向 `electron/main/services/` 迁移元数据（非本期）。

### 2. 菜单快捷键走 Main → Preload 事件，树快捷键走 Renderer

- **选择：** Save / Save As / Close Tab / Find in Files 在 `index.ts` 注册 `accelerator`，`webContents.send('menu:*')`；`preload` 暴露 `onMenuAction`；`FileExplorer` 在 `tabindex`/聚焦时监听 keydown。
- **理由：** ⌘S 无焦点时仍可用；与现有 `project:open` 模式一致。
- **备选（不采用）：** 全部 Renderer `window.addEventListener` — 失焦时不可靠。

### 3. 搜索用 Main 子进程 ripgrep

- **选择：** `fs:search` 接收 `{ rootPath, query, glob? }`，返回 `{ file, line, col, text }[]`；打包 `@vscode/ripgrep`。
- **理由：** 提案与 `proposal-bid-editor.md` 一致；避免 Renderer 扫盘。
- **待决：** 若 spike 体积过大，可降级为仅文件名 glob（需在阶段三前 0.5d spike）。

### 4. 自动保存默认开启，dirty 圆点仍显示直至落盘成功

- **选择：** 编辑 → `dirty=true` → debounce `writeFile` → 成功 `dirty=false`；⌘S 立即写并清 dirty。
- **理由：** 兼顾标书长文防丢与「未保存」可感知。
- **产品默认：** `autoSave: true`，`autoSaveDelay: 400`（可在设置关闭）。

---

## 技术设计

### 1. 数据流（目标）

```
打开文件 → openFiles 追加/激活 → Monaco 绑定 content
编辑 → dirty=true → (autoSave?) debounce → fs:writeFile → dirty=false
⌘S → 立即 writeFile
关闭 tab → if dirty → confirm → 从 openFiles 移除
搜索命中 → readFile + open tab → revealLineInCenter
```

### 2. IPC / Preload 扩展

| 通道 / 事件 | 说明 |
|-------------|------|
| `fs:saveAs` | dialog → `writeFile` → 返回新 `path` |
| `fs:openFile` | `showOpenDialog` 单文件 → `readFile` |
| `fs:search` | ripgrep JSON 输出解析 |
| `fs:watch`（可选） | 注册/注销 chokidar；`fs:fileChanged` 事件 |
| `menu:save` / `menu:saveAs` / `menu:closeTab` / `menu:findInFiles` / `menu:newFile` | Main → Renderer |

`WritcraftFs`（`src/types/writcraft.d.ts`）与 `electron/preload/index.ts` 同步扩展。

### 3. Renderer 状态（TypeScript）

```ts
type OpenFile = {
  path: string
  name: string
  content: string
  dirty: boolean
}
// App.vue: openFiles, activePath, saveStatus: 'idle' | 'saving' | 'saved' | 'error'
```

### 4. 文件变更（本期唯一改动集）

| 文件 | 说明 |
|------|------|
| `electron/main/fs-ipc.ts` | `saveAs`、`openFile`、`search`、冲突策略参数；可选 `watch` |
| `electron/main/index.ts` | 文件菜单项 + accelerators；`before-quit` dirty 检查（经 IPC 问 Renderer） |
| `electron/preload/index.ts` | 新 API + `onMenuAction` |
| `src/types/writcraft.d.ts` | 类型契约 |
| `src/App.vue` | `openFiles` 状态机、保存/关闭/切换、接菜单事件 |
| `src/composables/useWorkbench.ts` | **新建**（阶段二起）：从 App 抽出 save/close/tab 逻辑 |
| `src/components/workbench/EditorPane.vue` | 多 tab UI、emit close/select |
| `src/components/workbench/MonacoEditor.vue` | `defineExpose({ getEditor })`；光标/内容事件 |
| `src/components/workbench/FileExplorer.vue` | 树快捷键；重命名/删同步 tabs；粘贴冲突 UI |
| `src/components/workbench/SearchPanel.vue` | **新建** 搜索侧栏 |
| `src/components/workbench/StatusBar.vue` | 真实 line/col/saveStatus |
| `src/components/workbench/TitleBar.vue` | 设置入口 |
| `src/components/workbench/SettingsModal.vue` | **新建** 轻量设置 |
| `package.json` | `@vscode/ripgrep`、`chokidar`、`electron-store`（若尚未安装） |
| `electron/main/services/.gitkeep` | 预留目录 |

**明确不改：** `ChatPane.vue`、`AgentsPanel.vue` 业务；P2 占位可保留或标注「未实现」。

---

## 实施计划

### 阶段一：会话 + 保存 + 菜单（约 1 人日）

1. 扩展 `fs:saveAs`、`fs:openFile` IPC + preload 类型。
2. `App.vue`：`openFiles`、`activePath`、`dirty`、`saveCurrent`、`closeTab`、`confirmDirty`。
3. `EditorPane.vue`：可切换/可关闭多 tab + dirty 圆点。
4. `index.ts`：Save / Save As / Close Tab + accelerators；`onMenuAction` 接线。
5. 移除或改为「仅 dirty 时」触发的 `watch(editorContent)` 自动保存。
6. **验收：** 开 3 文件切换；⌘S 落盘；⌘W 关闭 dirty 提示；另存为路径更新。

### 阶段二：树联动 + 快捷键（约 1 人日）

1. `FileExplorer`：F2、Delete、⌘C/V/N；与 `openFiles` 同步重命名/删除。
2. `fs:copy`/`move` 增加 `onConflict: 'skip' | 'rename' | 'replace'`（或 Renderer 先检测再调 IPC）。
3. 抽 `useWorkbench.ts`（可选，若 App 已超 200 行）。
4. **验收：** 重命名已打开文件 tab 路径正确；粘贴重名可选策略；⌘N 新建并打开。

### 阶段三：项目搜索（约 1.5 人日）

1. Spike：`@vscode/ripgrep` 在 dev/build 下路径（0.5d，可并行）。
2. `fs:search` + `SearchPanel.vue`；`App.vue` 中 `search` activity 挂载 SearchPanel 而非 FileExplorer。
3. 结果点击 → 打开文件 + `revealLineInCenter`；⌘⇧F 聚焦搜索框。
4. **验收：** 项目内关键字命中列表；跳转正确行。

### 阶段四：状态栏 + 最近文件 + 监听 + 设置（约 1 人日）

1. `MonacoEditor` 光标 → `StatusBar`；保存状态文案。
2. `recent-files.json` 读写；打开文件时更新。
3. `chokidar` + 外部修改对话框。
4. `electron-store` + `SettingsModal`；自动保存开关/间隔。
5. `before-quit` 统一 dirty 检查。
6. **验收：** 状态栏行列随光标变；外部改文件有提示；设置生效。

---

## 测试策略

### 手工验收（主要）

1. 多标签 + dirty + ⌘S / ⌘W / 退出应用确认。
2. 另存为、打开单文件（无项目时亦可编辑）。
3. 树 F2/Delete/⌘C/V/N 与 tab 同步。
4. ⌘⇧F 搜索跳转行。
5. 自动保存关/开、修改 delay 后行为正确。
6. 外部修改文件提示。

### 可选自动化（非阻塞）

- 临时目录 fixture 调用 `fs:*` handler 测 rename/copy 冲突。
- 单条 Playwright：打开项目 → 开两文件 → 编辑 → ⌘S。

---

## 可观测性

（本期桌面本地应用，不单独建设指标平台。）

- **日志：** Main `fs:writeFile` / `fs:search` 失败 `console.error`；Renderer 保存失败 toast 含路径。
- **指标：** 无；手工计 grep 耗时即可。

---

## 后续考虑

### P2 backlog

- 命令面板（⌘⇧P）、Markdown OUTLINE、Git 状态、内置终端、编辑器分屏、主题切换、文件树拖放。

### 已知限制

- 全文读入内存，无大文件/二进制策略。
- 单根工作区；ripgrep 首次全量无索引缓存。
- Windows/Linux `revealInFinder`、accelerator 与自定义标题栏需实机验证。

### 向提案 2 迁移路径

- 稳定后把 `save/close/openFiles` 元数据迁入 `electron/main/services/document.ts`，Renderer 只持 Monaco content。

---

## 依赖

| 包 | 用途 |
|----|------|
| `@vscode/ripgrep` | 项目内容搜索 |
| `chokidar` | 工作区文件监听 |
| `electron-store` | 用户设置持久化 |

（Monaco、markdown-it、现有 electron-vite 不变。）

---

## 安全考量

- 继续禁止 Renderer 直接 `fs`；路径均来自用户选择或项目根下相对路径。
- `electron-store` 仅存 UI 偏好，**不**存 API Key（AI 配置另 epic）。
- 搜索/读取限制在项目 `rootPath` 内，避免 `..` 逃逸（IPC 内 `path.resolve` + 前缀校验）。

---

## 发布策略

（本期为本地开发功能迭代，无独立发布流水线变更。）

1. 分阶段合并 `main`，每阶段手工验收通过再进入下一阶段。
2. 阶段三前完成 ripgrep 打包验证后再打 release 包。

---

## 参考资料

- `docs/proposals/proposal-ide-basics.md` — 提案 1 全文
- `docs/research/research-ide-basics.md` — 缺口矩阵与实施顺序
- `docs/proposals/proposal-bid-editor.md` — 整体产品架构（Vue 3 已选定）

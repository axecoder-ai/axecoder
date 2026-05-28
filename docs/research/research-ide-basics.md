# 调研：WritCraft 通用 IDE 基础能力缺口

- **日期：** 2026-05-28
- **范围：** 文件 CRUD、快捷键、多标签/会话、搜索、状态栏、命令面板等「通用 IDE 基本盘」
- **关联提案：** `docs/proposals/proposal-ide-basics.md`
- **架构决策（沿用）：** 提案 1 已选定 — Electron + Vue 3 + `electron-vite`，Main `fs:*` IPC（见 `docs/proposals/proposal-bid-editor.md`）

---

## 1. 架构总览

```
Main (electron/main/index.ts, fs-ipc.ts)
  └─ Menu、fs:* IPC、dialog
Preload (electron/preload/index.ts)
  └─ contextBridge → window.writcraft
Renderer (src/App.vue + workbench/*)
  └─ 单 activeFilePath、防抖 writeFile、FileExplorer CRUD
```

Renderer **不可**直接访问 `fs`；所有持久化经 `window.writcraft`（`src/types/writcraft.d.ts`）。

---

## 2. IPC 契约（已实现）

| 通道 | 文件 | 说明 |
|------|------|------|
| `fs:openProject` / `fs:openFolder` | `electron/main/fs-ipc.ts:86-87` | 仅 `openDirectory` |
| `fs:readTree` / `readFile` / `writeFile` | 同上 `:89-102` | UTF-8 全文读写 |
| `fs:createFile` / `createDir` / `delete` / `rename` | 同上 `:104-126` | 目标存在则抛错 |
| `fs:copy` / `move` | 同上 `:134-149` | 无冲突策略 UI |
| `fs:revealInFinder` | 同上 `:151-154` | macOS 向 |
| `fs:getLastProject` | 同上 `:58-67` | `userData/last-project.json` |
| `project:open`（事件） | `electron/main/index.ts:47-48` | 菜单 ⌘O 触发 |

**未实现 IPC：** `saveAs`、`openFile`、`search/grep`、`watch`、最近文件列表。

---

## 3. 已实现能力矩阵

### 3.1 文件 / 项目

| 能力 | 状态 | 引用 |
|------|------|------|
| 打开文件夹项目 | ✅ | `FileExplorer.vue` `openProject`；`fs-ipc.ts` `doOpenProject` |
| 记住上次项目 | ✅ | `loadLastProject`；`getLastProject` |
| 树：新建/重命名/删除 | ✅ | `FileExplorer.vue` 内联 UI + 右键菜单 |
| 树：复制/剪切/粘贴 | ✅ | 内存 `clipboard` ref |
| 打开文件到编辑器 | ✅ | `App.vue:38-43` `onOpenFile` |
| 保存 | ⚠️ 仅自动 | `App.vue:64-69` 400ms 防抖 `writeFile`，无 dirty |
| 另存为 / 打开单文件 / 关闭文件 | ❌ | — |
| 外部变更监听 | ❌ | 仅手动 ↻ 刷新 |

### 3.2 编辑器

| 能力 | 状态 | 引用 |
|------|------|------|
| Monaco Markdown | ✅ | `MonacoEditor.vue` |
| 预览切换 | ✅ | `EditorPane.vue` |
| 多标签（打开/切换/关闭） | ❌ 壳占位 | `EditorPane.vue:23-28` 静态单 tab |
| 未保存圆点 / 关闭前确认 | ❌ | — |
| 撤销/重做（文本） | ⚠️ | `electron/main/index.ts:84-85` 系统 `role` |

### 3.3 快捷键与菜单

| 能力 | 状态 | 引用 |
|------|------|------|
| 打开项目 ⌘O | ✅ | `index.ts:71-73` |
| 保存 ⌘S / 另存为 | ❌ | 文件菜单无 Save |
| 文件树 Delete/F2/⌘N 等 | ❌ | 仅 Enter/Esc（重命名）`FileExplorer.vue` |
| 命令面板 ⌘⇧P | ❌ | — |
| Monaco Find 等 | ⚠️ | 编辑器聚焦时内置，未挂菜单 |

### 3.4 壳 UI（多为占位）

| 能力 | 状态 | 引用 |
|------|------|------|
| ActivityBar 搜索 | ❌ | `App.vue:30` search 仍显示 `FileExplorer` |
| 状态栏行列/错误数 | ❌ 假数据 | `App.vue:98` 写死 `line:1 col:15` |
| OUTLINE / TIMELINE | ❌ 占位 | `FileExplorer.vue` 底部按钮 |
| Git 分支 | ❌ 占位 | `StatusBar.vue` |
| 设置按钮 | ❌ | `TitleBar.vue` 无逻辑 |
| 主题切换 | ❌ | `style.css` + Monaco `vs-dark` 固定 |

---

## 4. 缺口与优先级

### P0（用户明确要求 + 日常阻塞）

1. **文件会话：** 多标签打开/切换/关闭；关闭/切换时 dirty 确认
2. **显式保存：** ⌘S、菜单 Save、保存失败 toast；与自动保存策略并存或可配置
3. **另存为 / 打开单文件：** `dialog.showSaveDialog` / `openFile`
4. **项目内搜索：** ActivityBar「搜索」独立面板 + ripgrep IPC（`proposal-bid-editor.md` 已列）
5. **粘贴冲突：** 复制到已存在路径时的替换/重命名（`fs:copy` 当前直接抛错 `:135`）

### P1（通用 IDE 体验）

6. **快捷键表：** 文件树 F2/Delete/⌘C/V/N；全局 ⌘W ⌘⇧S ⌘⇧F 等
7. **状态栏：** Monaco `onDidChangeCursorPosition`、语言、编码、保存状态
8. **最近打开文件：** `userData/recent-files.json`
9. **文件监听：** `chokidar` → 刷新树 / 提示外部修改
10. **设置页：** 自动保存间隔、主题、字体大小

### P2（对标完整 IDE，可分期）

11. 命令面板、面包屑、分屏、Git、终端、拖放移动、树多选、工作区多根

---

## 5. 数据流（当前 vs 目标）

**当前：**

```
点击树 → readFile → editorContent ref → watch 400ms → writeFile
```

**目标（最小多标签）：**

```
openFiles: Map<path, { content, dirty, model? }>
activePath → EditorPane tabs
save: 显式 writeFile + 清除 dirty；autoSave 可选
close: if dirty → confirm
```

---

## 6. 约束与风险

- 单根工作区；忽略 `node_modules`、`.git` 等（`fs-ipc.ts:12-18`）
- 大文件一律 UTF-8 读入内存，无流式/二进制策略
- 密钥/AI 不在本调研范围，但 Chat/Agents 当前为 mock UI
- Windows `revealInFinder` 需验证 `shell.showItemInFolder` 行为

---

## 7. 关键文件索引

| 路径 | 职责 |
|------|------|
| `electron/main/fs-ipc.ts` | 全部文件 IPC |
| `electron/main/index.ts` | 窗口、应用菜单 |
| `electron/preload/index.ts` | `writcraft` 桥接 |
| `src/types/writcraft.d.ts` | Renderer API 类型 |
| `src/App.vue` | 工作台状态、打开/保存 |
| `src/components/workbench/FileExplorer.vue` | 文件树 CRUD UI |
| `src/components/workbench/EditorPane.vue` | 编辑器/预览/标签壳 |
| `src/components/workbench/MonacoEditor.vue` | Monaco 实例 |
| `src/components/workbench/StatusBar.vue` | 状态栏 |
| `src/components/workbench/ActivityBar.vue` | 侧栏活动项 |

---

## 8. V1 建议实施顺序（依赖）

1. dirty 模型 + 显式保存（⌘S）→ 2. 多标签状态机 → 3. 另存为/打开文件 → 4. 菜单与文件树快捷键 → 5. 搜索面板 + ripgrep → 6. 状态栏真实数据 → 7. 最近文件 + chokidar → 8. 设置/主题

---

## 9. 调研缺口说明

本报告基于当前仓库源码静态分析，**非** `/research-codebase` 自动化流水线产出；与 `proposal-bid-editor.md` 中「待补调研」项一致。选定 IDE 基础方案后，实现阶段可对 ripgrep 打包体积、`safeStorage` 等做 1–2 天 spike。

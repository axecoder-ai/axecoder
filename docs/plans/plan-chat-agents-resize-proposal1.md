# Chat 与 Agents 侧栏可拖拽分栏（提案 1）设计文档

> 依据：用户截图中 **Chat 与 Agents 之间的竖向分隔线** 需支持左右拖拽调节宽度，且 **左右两侧均有最小宽度**。  
> **范围：** 仅 `.ai-side-panel` 内 `ChatPane` ↔ `AgentsPanel` 的分隔与宽度约束；不改主编辑器分栏、不改左侧资源管理器宽度。  
> **约束：** 最小改动；不引入第三方 split 库；Agents 隐藏时无分隔条。  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | 在 `ChatPane` 与 `AgentsPanel` 之间增加可拖拽分隔条；`AgentsPanel` 宽度可调；`ChatPane` 保持 `flex: 1` 并受 `min-width` 约束 |
| **不在范围** | AI 面板与编辑器之间的宽度调节、左侧 `primary-side` 宽度、底部终端高度、宽度持久化到 `config.json`（可作 P2） |
| **约束** | 拖拽使用 `pointerdown` / `pointermove` / `pointerup`（或 `mousemove` + `document`），避免影响 Electron 标题栏 drag 区域；分隔条 `user-select: none` |
| **时间线（估）** | **约 0.5 人日**（布局与拖拽 2–3h + 手工验收 1h） |

---

## 当前背景

- **布局：** `App.vue` 中 `.ai-side-panel` 为 `display: flex`，内含 `ChatPane`（`flex: 1`，`min-width: var(--wc-chat-min)` 即 320px）与 `AgentsPanel`（固定 `width: var(--wc-agents-w)` 即 280px）。
- **现状问题：** 两栏之间仅有 `ChatPane` 的 `border-right`，**无法拖拽**；Agents 宽度写死在 CSS 变量，用户无法按习惯加宽历史列表或给对话区更多空间。
- **已有变量：** `src/style.css` 中 `--wc-chat-min: 320px`、`--wc-agents-w: 280px`；`.ai-side-panel` 的 `min-width` 为两者之和。

---

## 需求

### 功能需求（P0）

- **R1 分隔条：** `agentsSidebarVisible === true` 时，在 `ChatPane` 与 `AgentsPanel` 之间显示竖向分隔条（宽约 4–6px 命中区，悬停/拖拽时高亮），光标 `col-resize`。
- **R2 拖拽：** 按住分隔条左右拖动时，**Agents 栏宽度**随之变化；`ChatPane` 由 `flex: 1` 自动占据剩余宽度。
- **R3 最小宽度 — 左（Chat）：** 拖拽后 `ChatPane` 实际宽度不得小于 `--wc-chat-min`（默认 320px，与现有一致）。
- **R4 最小宽度 — 右（Agents）：** `AgentsPanel` 宽度不得小于 `--wc-agents-min`（建议 **200px**，需在 `style.css` 新增变量）。
- **R5 最大宽度：** `AgentsPanel` 宽度上限为 `aiSidePanel.clientWidth - --wc-chat-min`，避免挤没对话区。
- **R6 隐藏 Agents：** `agentsSidebarVisible === false` 时不渲染分隔条；`ChatPane.agents-hidden` 行为不变（占满 `.ai-side-panel`）。

### 非功能需求

- 拖拽过程不触发文本选中；松开指针后移除 document 级监听。
- 窗口变窄时，若当前 `agentsWidth` 超出新的上限，在 `resize` 时 **clamp** 到合法区间（避免布局溢出）。

### 不在本期（P2）

- 将 `agentsWidth` 写入 `~/.writcraft/config.json` 或 `localStorage` 记忆。
- 双击分隔条恢复默认 280px。
- 抽通用 `SplitPane` 组件供左侧边栏复用。

---

## 设计决策

### 1. 只调 Agents 固定宽，Chat 用 flex（推荐）

- **选择：** `agentsWidth` 为 `ref(280)`，绑到 `AgentsPanel` 的 `style.width`；`ChatPane` 仍为 `flex: 1` + `min-width: var(--wc-chat-min)`。
- **理由：** 与现有结构一致，改动集中在 `App.vue` + `AgentsPanel` 去固定 CSS `width`；clamp 逻辑只需一个变量。
- **备选（不采用）：** 同时维护 `chatWidth` 与 `agentsWidth` — 状态冗余，且与 `flex: 1` 重复。

### 2. 分隔条与状态放在 `App.vue`（推荐）

- **选择：** 在 `App.vue` 的 `.ai-side-panel` 内、`ChatPane` 与 `AgentsPanel` 之间插入 `<div class="ai-split-handle" />`，拖拽逻辑写在该 `<script setup>` 中（约 30 行）。
- **理由：** 最小文件数；两子组件已通过 props/emit 协作，父级持有宽度最自然。
- **备选：** 新建 `AiSidePanel.vue` 包装 — 更清晰但多一个文件，本期可省略。

### 3. 宽度常量

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `--wc-chat-min` | 320px | 已有，Chat 最小宽 |
| `--wc-agents-min` | 200px | **新增**，Agents 最小宽 |
| `--wc-agents-w` | 280px | 保留为默认初始宽（逻辑初始值，拖拽后不再读 CSS） |

### 4. clamp 公式

```
containerW = aiSidePanelRef.getBoundingClientRect().width
agentsMin = 200  // 或读 CSS 变量
agentsMax = containerW - chatMin
agentsWidth = clamp(agentsWidth + deltaX, agentsMin, agentsMax)
```

- 向右拖（`deltaX > 0`）→ Agents 变宽；向左拖 → Agents 变窄。
- **注意：** 分隔条在 Chat 右缘，鼠标 `clientX` 增加时 Agents 应变宽。

---

## 技术设计

### 文件变更

| 文件 | 变更 |
|------|------|
| `src/style.css` | 新增 `--wc-agents-min: 200px` |
| `src/App.vue` | `agentsWidth` ref、`aiSidePanelRef`、分隔条 DOM、pointer 拖拽与 window `resize` clamp |
| `src/components/workbench/AgentsPanel.vue` | 去掉固定 `width: var(--wc-agents-w)`，改为 prop `width` 或父级 inline style |
| `src/components/workbench/ChatPane.vue` | 可选：Agents 可见时去掉 `border-right`，改由分隔条承担视觉分割 |

**不改：** `ChatPane` 业务逻辑、`AgentsPanel` 列表 IPC、`electron` 进程。

### 结构示意

```
.ai-side-panel (ref, flex)
  ├── ChatPane (flex:1, min-width: --wc-chat-min)
  ├── .ai-split-handle (v-show="agentsSidebarVisible")
  └── AgentsPanel (:style="{ width: agentsWidth + 'px' }", min-width via clamp)
```

### 分隔条样式要点

- 宽 4px，`flex-shrink: 0`，`cursor: col-resize`，背景透明，`:hover` / `.dragging` 时 `background: var(--wc-border-light)`。
- `touch-action: none`（若未来触屏）。

---

## 实施计划

### 步骤 1：CSS 变量（约 15min）

1. 在 `src/style.css` 增加 `--wc-agents-min: 200px`。

### 步骤 2：`App.vue` 拖拽（约 2h）

1. `const agentsWidth = ref(280)`，`const aiSidePanelRef = ref<HTMLElement | null>(null)`。
2. 模板中 `.ai-side-panel` 加 `ref`；`AgentsPanel` 传 `:width="agentsWidth"` 或 `:style`。
3. 插入 `.ai-split-handle`，`v-show="agentsSidebarVisible"`，`@pointerdown` 开始拖拽。
4. `pointerdown` → `setPointerCapture` → `pointermove` 累加 delta → `clamp` → `pointerup` 解绑。
5. `onMounted` + `onUnmounted` 监听 `window.resize`，对 `agentsWidth` 再 clamp。

### 步骤 3：`AgentsPanel.vue`（约 30min）

1. 新增 prop `width: number`（默认 280）。
2. `.agents-panel { width: … }` 改为绑定 `width` px；保留 `flex-shrink: 0`、`min-height: 0`。

### 步骤 4：`ChatPane` 边框（可选，约 15min）

1. Agents 可见时移除 `chat-pane` 的 `border-right`，避免与分隔条双线。

### 步骤 5：验收（约 1h）

**手工验收：**

- 默认打开 AI 面板，分隔条可见，拖至最左 Agents 约 200px、Chat 仍可读。
- 拖至最右 Chat 约 320px、Agents 占满剩余。
- 隐藏 Agents 后无分隔条，Chat 全宽。
- 缩小窗口后两侧仍满足最小宽、无横向滚动条异常。

---

## 测试策略

- **手工：** 上述验收项。
- **单元：** 本期可不测（纯 DOM 拖拽）；若抽 `clampAgentsWidth(w, container, chatMin, agentsMin)` 可单测 clamp 边界。

---

## 安全 / 发布 / 可观测性

- 无网络、无 IPC 变更；不涉及发布流程变更。
- 无新增遥测。

---

## 参考资料

- `src/App.vue` — `.ai-side-panel` 布局
- `src/components/workbench/ChatPane.vue` — `--wc-chat-min`
- `src/components/workbench/AgentsPanel.vue` — 固定 `--wc-agents-w`
- `src/style.css` — 布局 CSS 变量

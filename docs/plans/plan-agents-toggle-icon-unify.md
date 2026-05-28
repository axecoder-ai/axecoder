# Agents 历史侧栏折叠图标与标题栏统一 设计文档

> 依据：用户截图标注 — Agents 历史面板顶栏折叠钮（红框）应与**标题栏右上**「显示/隐藏 AI 面板」按钮使用**同一套**侧栏布局 SVG。  
> **范围：** 仅统一内联 SVG path，不改折叠/展开逻辑与布局。  
> **约束：** 最小改动；不新增 npm 依赖；本期不抽取 icon 组件（可选后续）。  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | 将 `AgentsPanel.vue` 顶栏 `panel-toggle`、以及 `ChatPane.vue` 在 Agents 隐藏时的 `agents-expand`，替换为与 `TitleBar.vue` `toggleAiPanel` **完全一致**的 SVG |
| **不在范围** | 标题栏左侧主侧栏 toggle；`ChatPane` 输入区「历史会话」时钟图标；`TitleBar` 是否改为聊天气泡（见 `plan-titlebar-chat-icon.md`，另案） |
| **约束** | 以 `TitleBar.vue` 现有 path 为唯一真源；16×16、`currentColor`、`fill="none"` 与 `class="sidebar-toggle-icon"` 风格一致 |
| **时间线（估）** | **约 0.25 人日**（替换 2 处 SVG + 目视对比 15min） |

---

## 当前背景

- **组件关系：**
  - `TitleBar.vue` → `toggleAiPanel`：控制整个 AI 聊天区域显隐；图标为「外框 + **右侧**竖条填充」。
  - `AgentsPanel.vue` → `panel-toggle`：折叠 Agents **历史列表**子侧栏。
  - `ChatPane.vue` → `agents-expand`：历史侧栏隐藏时，在聊天标签栏提供「展开历史」入口。
- **现状问题：** 三处语义相关（AI/历史侧栏布局），但 Agents 相关两处 SVG 与标题栏**参数不一致**，视觉上有细微差别（外框 y/height、右侧条 x/width、stroke 写法），用户反馈应「也用上面的图标」。

| 位置 | 外框 | 右侧填充条 |
|------|------|------------|
| `TitleBar` `toggleAiPanel`（真源） | `y=3.5` `h=9` | `x=9` `w=3.5` |
| `AgentsPanel` `panel-toggle` | `y=4.5` `h=7` | `x=10.5` `w=2.5` |
| `ChatPane` `agents-expand` | 同 AgentsPanel | 同 AgentsPanel |

```64:67:src/components/workbench/TitleBar.vue
        <svg class="sidebar-toggle-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" />
          <rect x="9" y="4.5" width="3.5" height="7" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
```

```86:89:src/components/workbench/AgentsPanel.vue
          <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
            <rect x="2.5" y="4.5" width="11" height="7" rx="1.5" fill="none" stroke="currentColor" stroke-width="1" />
            <rect x="10.5" y="5" width="2.5" height="6" rx="0.5" fill="currentColor" />
          </svg>
```

---

## 需求

### 功能需求

- **F1：** `AgentsPanel` 顶栏折叠按钮 SVG 与 `TitleBar` `toggleAiPanel` **逐字一致**（含 `fill="none"` 根节点、两个 `<rect>` 坐标）。
- **F2：** `ChatPane` `agents-expand`（`v-if="!agentsSidebarVisible"`）使用**同一** SVG，保证历史侧栏收起后展开钮与标题栏视觉一致。
- **F3：** `title` 文案保持语义不变：`AgentsPanel`「隐藏 Agents 历史」、`ChatPane`「显示 Agents 历史」；点击仍 `emit('toggle')` / `emit('showAgentsSidebar')`。
- **F4：** 不修改 `ChatPane` 输入区 footer 的「历史会话」按钮（仍为时钟/刷新类图标，职责不同）。

### 非功能需求

- 1x 缩放下与标题栏按钮并排对比无肉眼可见几何差异。
- 不引入 icon 库；与项目内联 SVG 惯例一致。

---

## 设计决策

### 1. 以 TitleBar 为真源，复制 path（推荐）

- **选择：** 从 `TitleBar.vue` 复制 `<svg>…</svg>` 到 `AgentsPanel.vue`、`ChatPane.vue`，不新建共享组件。
- **理由：** 仅 2 处消费 + 1 处真源，改动面最小；符合「尊享最小化代码小改」。
- **取舍：** 三处重复 path，后续若改图标需改 3 文件；若漂移再抽取（见后续考虑）。

### 2. 本期不改 TitleBar 图标

- **选择：** 不合并或修改 `plan-titlebar-chat-icon.md`（标题栏改聊天气泡为**独立**产品决策）。
- **理由：** 本需求仅要求 Agents 侧栏「跟上面一致」；真源暂定为 TitleBar **当前** panel 图标。
- **注意：** 若日后 TitleBar 改为聊天气泡，需产品确认 Agents 历史折叠钮是否仍跟 TitleBar，或保持 panel 图标 — 不在本期实施。

### 3. 图标职责（实施后）

| 位置 | 动作 | 图标 |
|------|------|------|
| 标题栏右上 | 切换整个 AI 面板 | 右侧 panel 布局（真源） |
| AgentsPanel 顶栏 | 折叠历史列表 | **与上相同** |
| ChatPane 标签栏 | 展开历史列表 | **与上相同** |
| ChatPane 输入区 | 打开历史会话 | 时钟/历史（保持） |

---

## 技术设计

### 1. 核心组件

无逻辑变更；仅 template 内 SVG 替换。真源片段：

```html
<svg class="sidebar-toggle-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
  <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" />
  <rect x="9" y="4.5" width="3.5" height="7" rx="0.5" fill="currentColor" stroke="none" />
</svg>
```

`AgentsPanel` / `ChatPane` 可保留现有 `width="16" height="16"` 或统一加 `class="sidebar-toggle-icon"`（样式非必须，二选一即可）。

### 2. 集成点

- `App.vue`：`toggleAgentsSidebar`、`agentsSidebarVisible`、`@toggle` / `@show-agents-sidebar` 不变。
- 无 IPC / 持久化变更。

### 3. 文件变更

| 文件 | 变更 |
|------|------|
| `src/components/workbench/AgentsPanel.vue` | `panel-toggle` 内 SVG 替换为 TitleBar 同款 |
| `src/components/workbench/ChatPane.vue` | `agents-expand` 内 SVG 替换为 TitleBar 同款 |

**本次变更仅涉及上述 2 个文件**（`TitleBar.vue` 只读参照，不修改）。

---

## 实施计划

1. **阶段一：替换 SVG（约 20min）**
   - 打开 `TitleBar.vue`，复制 `toggleAiPanel` 按钮内完整 `<svg>`。
   - 粘贴覆盖 `AgentsPanel.vue` `panel-toggle` 与 `ChatPane.vue` `agents-expand` 中的旧 SVG。
   - 保留各按钮原有 `title`、`@click`、`class`（如 `panel-toggle` / `agents-expand`）。

2. **阶段二：目视验收（约 15min）**
   - 启动 dev，打开项目，展开 AI 面板与 Agents 历史侧栏。
   - 对比标题栏右上与 Agents 顶栏折叠钮：形状一致。
   - 点击 Agents 折叠 → 聊天标签栏出现展开钮，图标与标题栏一致。
   - 确认折叠/展开、拖拽宽度、选中会话等行为无回归。

---

## 测试策略

### 单元测试

- 不适用（纯 markup）。

### 手工验收

- [ ] Agents 顶栏折叠图标与标题栏 AI 面板图标视觉一致
- [ ] 历史侧栏隐藏后，ChatPane 标签栏展开钮图标一致
- [ ] 折叠/展开功能正常
- [ ] 输入区「历史会话」图标未误改

---

## 可观测性

（不适用）

---

## 后续考虑

### 潜在增强

- 抽取 `src/components/icons/RightPanelLayoutIcon.vue`（或单文件 export 的 SVG 字符串），供 `TitleBar`、`AgentsPanel`、`ChatPane` 引用，避免三处漂移。
- 与 `plan-titlebar-chat-icon.md` 对齐时，明确「AI 面板入口」与「历史子侧栏」是否继续共用同一图标。

### 已知限制

- 三处内联重复；改图标需同步或抽取组件。

---

## 依赖

（无新增依赖）

---

## 安全考量

（不适用）

---

## 发布策略

随下一版 UI 小修复常规发布，无迁移与功能开关。

---

## 参考资料

- 用户截图：`assets/image-47e62073-56a5-4aa8-9584-34ff66d8d82d.png`
- 真源：`src/components/workbench/TitleBar.vue`（`toggleAiPanel`）
- 相关（本期修改）：`src/components/workbench/AgentsPanel.vue`、`src/components/workbench/ChatPane.vue`
- 相关（不改/另案）：`docs/plans/plan-titlebar-chat-icon.md`

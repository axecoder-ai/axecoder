# 标题栏 AI 面板图标修正 设计文档

> 依据：用户截图反馈 — 顶部标题栏右侧按钮（红框）误用「右侧边栏布局」图标，应改为**聊天框**图标；箭头标注表明该按钮才是「切换 AI 聊天面板」的入口。  
> **范围：** 仅 `TitleBar.vue` 中 `toggleAiPanel` 按钮的 SVG 图标。  
> **约束：** 最小改动；不调整交互逻辑与布局；Agents 历史侧栏的折叠/展开图标保持现状。  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | 将标题栏「显示/隐藏 AI 面板」按钮图标，从右侧边栏布局图标改为聊天框（message bubble）图标 |
| **不在范围** | `ChatPane.vue` / `AgentsPanel.vue` 中 Agents 历史侧栏的 panel 图标；设置齿轮图标；左侧主侧栏 toggle |
| **约束** | 16×16 viewBox，沿用 `currentColor` + `icon-btn` 样式；`title="显示/隐藏 AI 面板"` 不变 |
| **时间线（估）** | **约 0.25 人日**（换 SVG + 手工目视验收 30min） |

---

## 当前背景

- **组件关系：**
  - `TitleBar.vue` 右上角 `toggleAiPanel` → 控制整个 AI 聊天区域（`aiPanelVisible`）显隐。
  - `ChatPane.vue` 标签栏 `agents-expand` / `AgentsPanel.vue` `panel-toggle` → 控制 Agents **历史列表**子侧栏显隐，语义是「面板布局」。
- **现状问题：** 两处均使用相同的 SVG（矩形 + 右侧竖条填充），用户无法区分「开关聊天区」与「开关历史列表」。
- **用户反馈（截图）：** 红框标出标题栏按钮；箭头指向聊天区顶部，说明该按钮应表达「聊天」而非「侧栏布局」。

```64:67:src/components/workbench/TitleBar.vue
        <svg class="sidebar-toggle-icon" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <rect x="2.5" y="3.5" width="11" height="9" rx="1.5" stroke="currentColor" />
          <rect x="9" y="4.5" width="3.5" height="7" rx="0.5" fill="currentColor" stroke="none" />
        </svg>
```

---

## 需求

### 功能需求

- **F1：** 标题栏 `toggleAiPanel` 按钮 SVG 改为**聊天气泡**造型（圆角矩形气泡 + 可选小尾巴或三点，风格与现有 16px 线框图标一致）。
- **F2：** 图标语义与 `title="显示/隐藏 AI 面板"` 一致；`active` 态（面板可见时高亮）行为不变。
- **F3：** Agents 历史相关按钮（`ChatPane` 展开、`AgentsPanel` 折叠）**继续**使用现有 panel 布局图标，不与标题栏混用。

### 非功能需求

- 图标在 `--wc-text-muted` / `--wc-text` 下清晰可辨，1x 缩放下不与设置齿轮混淆。
- 无新增 npm 依赖；不引入 icon 库（与项目内联 SVG 惯例一致）。

---

## 设计决策

### 1. 仅改 TitleBar，不统一抽取 icon 组件（推荐）

- **选择：** 在 `TitleBar.vue` 内联替换 SVG path，不新建 `icons/` 模块。
- **理由：** 单点修改；Agents panel 图标逻辑上不同，不宜强行共用。
- **取舍：** 若后续多处需要聊天气泡，再考虑抽取（本期不做）。

### 2. 聊天气泡造型（推荐）

- **选择：** 16×16 viewBox，stroke 线框风格（与左侧主侧栏 toggle、设置齿轮一致），例如：
  - 圆角矩形气泡主体（约 x=2.5–13.5, y=3–11）
  - 底部小三角或缺角示意「对话」
  - 可选：气泡内 2–3 个小圆点表示消息（参考 Cursor / VS Code Copilot 聊天入口）
- **备选：** 实心填充气泡 — 与 `sidebar-toggle-icon` 线框+填充混用风格略不一致，不采用。

### 3. 图标职责划分

| 位置 | 动作 | 图标 |
|------|------|------|
| 标题栏右上 | 切换整个 AI/Chat 面板 | **聊天气泡（新）** |
| ChatPane 标签栏 | 展开 Agents 历史 | 右侧 panel 布局（保持） |
| AgentsPanel 顶栏 | 折叠 Agents 历史 | 右侧 panel 布局（保持） |
| ChatPane 输入区 | 打开历史会话 | 历史/时钟（保持） |

---

## 技术设计

### 1. 核心组件

仅 `TitleBar.vue` template 中 `toggleAiPanel` 按钮内的 `<svg>` 替换为新 path；class 可改为 `chat-toggle-icon` 或继续复用 `sidebar-toggle-icon`（样式相同，改 class 非必须）。

### 2. 集成点

- 无 IPC / 状态变更；`App.vue` 仍 `@toggle-ai-panel="toggleAiPanel"`。
- 菜单 `Toggle Chat Panel`（`menu:toggleChat`）行为不变，仅视觉图标更新。

### 3. 文件变更

| 文件 | 变更 |
|------|------|
| `src/components/workbench/TitleBar.vue` | 替换 `toggleAiPanel` 按钮 SVG 为聊天气泡 |

**本次变更仅涉及上述 1 个文件。**

---

## 实施计划

1. **阶段一：替换 SVG（约 30min）**
   - 在 `TitleBar.vue` 将 AI 面板按钮 SVG 改为聊天气泡 path。
   - 确认 `width/height` 仍为 16px，`aria-hidden="true"` 保留。

2. **阶段二：目视验收（约 15min）**
   - 启动 dev，打开项目，确认标题栏图标为聊天气泡。
   - 点击 toggle：面板显隐与 `active` 高亮正常。
   - 对比 Agents 历史折叠钮：仍为 panel 图标，二者可区分。
   - macOS 标题栏 inset / 全屏下对齐无错位。

---

## 测试策略

### 单元测试

- 不适用（纯 SVG  markup，无逻辑）。

### 集成测试 / 手工验收

- [ ] 标题栏按钮显示聊天气泡，非侧栏布局图标
- [ ] 点击后 AI 面板显示/隐藏正常
- [ ] 面板可见时按钮 `active` 样式正常
- [ ] 与设置按钮、左侧侧栏 toggle 并排时不拥挤、不混淆

---

## 可观测性

（不适用）

---

## 后续考虑

### 潜在增强

- 若产品要求全局统一 icon set，可抽取 `src/components/icons/ChatBubbleIcon.vue` 供 TitleBar / 空状态等复用。

### 已知限制

- 聊天气泡与「历史会话」时钟图标仍属不同入口，需在 tooltip 文案上保持区分（已有 `title` 属性）。

---

## 依赖

（无新增依赖）

---

## 安全考量

（不适用）

---

## 发布策略

随下一版 UI 小修复常规发布，无迁移与开关。

---

## 参考资料

- 用户截图：`assets/image-1721a19d-3666-49d9-aee3-ff371e70d359.png`
- 现有实现：`src/components/workbench/TitleBar.vue`
- 相关（不改）：`src/components/workbench/ChatPane.vue`、`src/components/workbench/AgentsPanel.vue`

# Agents 右侧列表 Cursor 式样式（提案 1）设计文档

> 依据：用户参考图（Cursor Agents 侧栏）— 顶部搜索、描边「New Agent」按钮、**Today** 分组、带图标的双行列表项、底部「更多」等视觉结构。  
> **范围：** 仅 `AgentsPanel.vue` 的模板与 scoped 样式；数据仍来自现有 `getChatSessions` / `ChatSessionMeta`。  
> **约束：** 最小改动、不新增 IPC；无 Agent 运行态数据时不伪造「Reading xxx」「+421 · 4 Files」。  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | 重排 Agents 侧栏 DOM 结构；对齐参考图的间距、字号、描边按钮、分组标题、列表项双行+左侧图标、选中/悬停态 |
| **不在范围** | Marketplace 底栏、真实 Agent 任务状态、文件变更统计、流式「思考中」副标题、列表宽度拖拽（见 `plan-chat-agents-resize-proposal1.md`） |
| **约束** | 沿用 `--wc-*` 色板；中文文案（搜索占位、按钮、分组）；隐藏侧栏的 toggle 行为保留 |
| **时间线（估）** | **约 0.5 人日**（样式与分组 2–3h + 手工对照参考图 1h） |

---

## 当前背景

- **组件：** `src/components/workbench/AgentsPanel.vue`。
- **现状结构：** 顶栏 `Agents` 标题 + 折叠钮 → 搜索框 → 实心灰底「新建对话」→ 扁平列表（标题 +「X 分钟前」）。
- **与参考图差距：**

| 参考图元素 | 现状 |
|------------|------|
| 顶部仅搜索，无粗标题栏 | 有 35px `panel-header`「Agents」 |
| `New Agent` 全宽描边按钮 | `new-agent` 实心 `var(--wc-hover)` 背景 |
| 分组标题 `Today` | 无分组，全列表按时间排序 |
| 项左图标 + 主标题 + 灰色副标题 | 无图标，副标题仅为相对时间 |
| 当前项弱高亮 + 活动图标 | 仅 `background: var(--wc-active)` |
| 列表底 `... More` | 无 |
| 底栏 `Browse Marketplace` | 无（本期不做） |

- **数据：** `ChatSessionMeta` 仅有 `id`、`title`、`updatedAt`，不足以展示「Reading …」「Edited …」类副标题（除非扩展存储，见 P2）。

---

## 需求

### 功能需求（P0）

- **S1 顶区：** 去掉或弱化原 `panel-header` 大标题条；**首行即搜索框**（占位如「搜索对话…」，样式贴近参考：深色底、小圆角、左右内边距一致）。折叠 Agents 的按钮移到搜索行右侧或保留小图标钮，不占用整行标题。
- **S2 新建按钮：** 全宽 **描边** 按钮（`border: 1px solid var(--wc-border-light)`、透明/极浅底、圆角 ~8px、文案「新建对话」），悬停略提亮边框或背景；**不要**大块实心灰底。
- **S3 时间分组：** 按 `updatedAt` 将列表分为至少两组并显示小标题：
  - **今天** — 自然日等于当天；
  - **更早** — 其余（参考图仅展示 `Today`，WritCraft 用「更早」承接历史，避免空白分组）。
  - 空分组不渲染标题。
- **S4 列表项布局：** 每行 `display: flex; gap: 8–10px`：
  - **左：** 16×16 图标区 — 当前选中会话用「进行中」图标（圆环/星芒类线框 SVG）；其余用「已完成」勾选圆图标（线框 SVG，与参考一致即可）。
  - **右：** 主标题单行省略（`ellipsis`）；副标题单行省略、字号 11px、`var(--wc-text-dim)`。
- **S5 副标题文案（本期）：** 使用已有 `formatTime(updatedAt)` 放在副标题行（主标题仍为 `title`），不编造文件/Reading 文案。
- **S6 交互态：** `hover` 行背景 `var(--wc-hover)`；`active`（`activeSessionId`）略深背景 + 主标题字重略高；点击仍 `emit('selectSession')`。
- **S7 列表滚动：** `panel-body` 内列表区域 `flex: 1; overflow-y: auto`；搜索+按钮固定在顶，不随列表滚走。
- **S8 折叠：** 保留 `emit('toggle')`，入口为搜索行右侧图标（与现 `panel-toggle` 行为相同）。

### 功能需求（P1，可选同 PR）

- **S9 列表截断 +「更多」：** 默认每组最多展示 8 条，超出显示「… 更多」文字钮，点击展开该组全部（本地 `ref` 状态即可，无 IPC）。

### 不在本期（P2）

- 副标题显示最后一条消息摘要 → 需在 `index.json` 增加 `preview` 字段并在 `saveChatSession` 时写入。
- 进行中/已完成图标随真实 Agent 任务状态切换。
- `Browse Marketplace` 底栏与扩展市场联动。
- 英文文案 `Search Agents…` / `New Agent`（若产品要求中文化则保持中文）。

---

## 设计决策

### 1. 仅改 `AgentsPanel.vue`（推荐）

- **选择：** 模板 + scoped CSS + 少量 computed（分组列表）均在单文件完成。
- **理由：** 纯展示层；`App.vue` / IPC 无需动。

### 2. 分组逻辑放在 computed（推荐）

```ts
// 伪意：按本地「今天」切分
const groups = computed(() => {
  const today: ChatSessionMeta[] = []
  const older: ChatSessionMeta[] = []
  for (const s of filtered.value) {
    if (isToday(s.updatedAt)) today.push(s)
    else older.push(s)
  }
  return [
    { label: '今天', items: today },
    { label: '更早', items: older },
  ].filter((g) => g.items.length)
})
```

- **理由：** 不增 API；与参考图 `Today` 一致。

### 3. 图标用内联 SVG（推荐）

- **选择：** 两个静态 SVG（active / idle），不引 icon 库。
- **理由：** 与项目其他 workbench 组件一致。

### 4. 顶栏处理

- **选择：** 移除独立 `panel-header` 行；`panel-body` 顶部 `padding: 12px 12px 0`，第一控件为搜索；toggle 与搜索同一 flex 行。
- **理由：** 对齐参考图「搜索在最上」；减少垂直占用。

### 5. 副标题不造假

- **选择：** 副标题 = 相对时间；主标题 = 会话 `title`。
- **理由：** 符合最小改动；参考图中的「Reading …」留待有任务状态数据后再做。

---

## 技术设计

### 目标结构（DOM）

```
aside.agents-panel
  .panel-top（flex-shrink: 0, padding）
    .search-row
      input.search-agents
      button.panel-toggle
    button.new-agent（outline）
  .panel-list（flex: 1, overflow-y: auto）
    section.agent-group（v-for group）
      .group-label（今天 / 更早）
      ul.agent-list
        li.agent-item（icon + .agent-text）
          .agent-title
          .agent-sub
    button.more-link（可选 P1）
```

### 样式要点（对齐参考图）

| 元素 | 建议值 |
|------|--------|
| 侧栏背景 | `var(--wc-bg-dark)` 或略深于现 `var(--wc-sidebar)`，与参考近黑底一致 |
| 搜索框 | `background: #2a2a2a` 或 `var(--wc-input-bg)`；`border-radius: 6px`；`height: 32px`；字号 12px |
| 新建按钮 | 透明底 + `border: 1px solid #3c3c3c`；`padding: 8px 12px`；`margin-top: 8px` |
| 分组标题 | 11px，`var(--wc-text-dim)`，`padding: 12px 0 6px`，`font-weight: 500` |
| 列表项 | `padding: 8px 6px`；`border-radius: 6px`；项间距 2–4px |
| 主标题 | 13px，`var(--wc-text)` |
| 副标题 | 11px，`var(--wc-text-dim)`，`margin-top: 2px` |

### 文件变更

| 文件 | 变更 |
|------|------|
| `src/components/workbench/AgentsPanel.vue` | 模板重排、分组 computed、SVG 图标、样式重写 |
| `src/style.css` | 可选：新增 `--wc-agents-bg` 若需与 sidebar 区分（非必须） |

**不改：** `ChatPane.vue`、`App.vue`（除非 toggle 入口文案）、`chat-store`、类型定义。

---

## 实施计划

### 步骤 1：顶区（约 45min）

1. 删除原 `panel-header` 块。
2. 实现 `search-row` + `panel-toggle`。
3. 描边样式 `new-agent`。

### 步骤 2：分组与列表（约 1.5h）

1. 增加 `isToday(ts)` 与 `groups` computed。
2. 双层 `v-for`（group → item）。
3. 列表项加图标列 + 双行文本。

### 步骤 3：态与滚动（约 45min）

1. `active` / `hover` 样式微调，对照参考截图。
2. `panel-list` 滚动；长标题 `text-overflow: ellipsis`。
3. 空态「暂无对话记录」保留在列表区居中或顶下。

### 步骤 4：可选「更多」（约 30min）

1. 每组 `slice(0, limit)` + `showMore` ref。
2. 「… 更多」链式按钮样式（11px、muted、无 border）。

### 步骤 5：验收（约 1h）

**手工对照参考图：**

- 搜索在最上；新建按钮为描边全宽。
- 有「今天」分组；会话按更新时间落入正确组。
- 列表项左图标 + 双行；选中项可辨。
- 折叠钮仍可用；选会话仍切换 `ChatPane`。
- 窄宽（~200px 最小宽）下标题/副标题省略号正常。

---

## 测试策略

- **手工：** 上述验收；多会话跨天数据（改系统日期或 mock `updatedAt`）验证分组。
- **单元：** 可选对 `isToday` / 分组纯函数单测（若抽出到 `utils`）；非必须。

---

## 安全 / 发布 / 可观测性

- 无影响。

---

## 参考资料

- 用户参考图：`assets/image-05c89d63-28be-48ba-a058-fe130aa4fff6.png`（Cursor Agents 侧栏）
- `src/components/workbench/AgentsPanel.vue` — 当前实现
- `docs/plans/plan-chat-agents-resize-proposal1.md` — 侧栏宽度拖拽（独立 PR）
- `docs/proposals/proposal-chat.md` — 聊天/Agents 产品背景

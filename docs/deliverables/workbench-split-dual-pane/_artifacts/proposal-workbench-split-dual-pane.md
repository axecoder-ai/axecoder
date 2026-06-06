## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 一键分屏：左（资源管理器 + 编辑器）与右（会话列表 + 聊天）分离，支持跨物理屏幕工作。
- **调研来源：** `docs/deliverables/workbench-split-dual-pane/_artifacts/00-research-links.md`
- **上游提案：** `docs/proposals/proposal-workbench-split-dual-pane.md`（make-proposals 草稿）
- **选定基础：** 提案 2 – 双 BrowserWindow
- **用户调整摘要：** 交付形态为**两个独立窗口**（非单窗口 CSS 分栏）。

---

### 最终方案 – 主窗代码区 + 会话伴生窗

- **概述：** 主窗口保持现有代码编辑布局；TitleBar 增加「双窗分屏」按钮，打开第二个 `BrowserWindow`（`#companion`），仅渲染 `AgentsPanel` + `ChatPane` 全宽。主窗在伴生窗打开时隐藏右侧 AI 列，避免重复。Agent/Workshop 流式进度向**所有**渲染进程广播。关闭伴生窗后主窗恢复右侧 AI 列。
- **相对选定提案的变更：** 用户强调「两个窗口」；不实现单窗口中缝分屏。
- **关键变更：**
  - `electron/main/index.ts` — 伴生窗创建/关闭/定位（优先副屏 workArea）
  - `electron/main/renderer-broadcast.ts` — 多窗 `webContents.send`
  - `electron/main/agent/agent-progress-emit.ts`、`workshop-progress-emit.ts` — 广播
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts` — `getWindowRole`、`openCompanionWindow` 等
  - `src/App.vue`、`src/components/workbench/TitleBar.vue` — 角色分支与切换
  - `src/utils/workbench-window-role.ts` — 角色解析（单测）
  - `shared/i18n/locales/*.ts`
- **权衡：**
  - ✅ 满足双显示器；会话与项目数据仍走主进程 IPC/store
  - ❌ 双份 Vue 挂载 ChatPane（只读伴生窗不发起新 agent run 的约束由现有单例 IPC 保证）
- **验证：** 开/关伴生窗、副屏定位、主窗隐藏/恢复 AI 列、会话切换、agent 进度两窗可见
- **待解决问题：** 伴生窗是否显示精简 TitleBar（本轮：仅项目名 + 关闭合并提示）；终端仅主窗

### 未采纳方案说明

- **未选：** 提案 1 – 单窗口分屏模式
- **原因：** 用户选定双窗，且调整说明明确要两个窗口。

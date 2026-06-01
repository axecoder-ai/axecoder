# 已确认解决方案提案：删除标书优化功能

---

## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 将 WritCraft 从标书撰写场景转向**写代码专用 IDE**，删除系统中所有针对标书优化的功能模块。
- **调研来源：** `docs/proposals/proposal-bid-editor.md`、`docs/proposals/proposal-background-materials.md`、`docs/plans/plan-slash-init-proposal1.md`、`docs/research/research-ide-basics.md`；源码 HEAD 中 BackgroundPanel、background IPC、`/init`、`tools-complex` 等模块。
- **上游提案：** `docs/proposals/proposal-remove-bid-features.md`（双方案草稿）
- **选定基础：** 提案 1 – 彻底物理删除
- **用户调整摘要：** 无额外调整，按方案原文执行

### 现状总结

WritCraft 当前（HEAD）含标书专属能力：背景资料侧栏 Tab、`.writcraft/background.json` manifest、`/init` 扫描招标/磋商/参数文件、AI 背景初始化、Agent `ExpandChapter`/`SummarizeChapter` 章节工具。工作区已有未提交的部分删除 diff（约 −4100 行），方向与本案一致但未验收。

---

### 最终方案 – 彻底物理删除标书模块

- **概述：** 一次性删除所有标书专属模块，侧栏第三 Tab 恢复 SCM，产品文案统一为代码编写 IDE。不保留 feature flag，不迁移数据。
- **相对选定提案的变更：** 无（用户确认无调整）
- **关键变更：**
  - **删除：** `BackgroundPanel.vue`、`BackgroundMaterialsIcon.vue`；`background-materials.ts`、`background-init*.ts`（main/utils/ai）；`slash-commands/init/`；`agent/tools-complex/`；对应单测目录
  - **UI：** `SidebarViewBar` 恢复 `scm`；`App.vue` 移除 BackgroundPanel 与 backgroundContextPaths；`ChatPane` 移除背景路径合并
  - **IPC/类型：** 删除 `readBackgroundMaterials`、`fs:initBackground` 及 preload/types 声明
  - **Agent：** 移除 complex tools 注册与执行
  - **斜杠命令：** 清空 `/init`；删除 `SlashContext.initBackground`
  - **文案：** README、WelcomePage 定位为代码 IDE
  - **保留：** Read/Edit/Write/Grep/Glob/Delete/Move、Monaco、ScmPanel、聊天附件
- **权衡：**
  - 收益：定位清晰、维护成本最低、包体更轻
  - 风险：用户项目内 `.writcraft/background.json` 成为孤儿文件（不主动删除）
- **验证：** 全量 vitest 通过；手工确认无背景 Tab、无 `/init`、无 ExpandChapter/SummarizeChapter
- **待解决问题：** `docs/` 历史文档保留作归档，不在本次删除范围

### 未采纳方案说明

- **未选：** 提案 2 – UI 下线 + 内核归档
- **原因：** 用户选定彻底删除，与「写代码专用」定位最契合

---

**路径：** `docs/proposals/proposal-remove-bid-features.md`

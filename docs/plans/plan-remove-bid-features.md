# 删除标书优化功能 设计文档

> 依据：`docs/proposals/proposal-remove-bid-features.md`（已确认，提案 1）
> **范围：** 物理删除背景资料、/init、background IPC、Agent 章节工具；侧栏恢复 SCM；文案改为代码 IDE
> **不在范围：** 删除 `docs/` 历史文档；删除用户项目内 `.writcraft/background.json`

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | 见下方文件变更清单 |
| **约束** | 最小 diff；保留通用 Agent 工具与 Git SCM；不新增 feature flag |
| **时间线（估）** | 约 0.5 人日（删除 + 单测更新 + 回归） |

---

## 当前背景

- **现状：** HEAD 含 BackgroundPanel、background manifest IPC、`/init` 斜杠命令、ExpandChapter/SummarizeChapter Agent 工具；侧栏第三 Tab 为「背景资料」。
- **痛点：** 产品定位需转向写代码专用 IDE，标书模块增加维护负担且与场景不符。
- **已有能力（保留）：** Read/Edit/Write/Grep/Glob/Delete/Move、Monaco、ScmPanel、聊天附件。

---

## 需求

### 功能需求

- **F1 删除 UI：** 移除 BackgroundPanel、背景 Tab；恢复 SCM Tab 与 ScmPanel 挂载。
- **F2 删除 IPC：** 移除 `readBackgroundMaterials`、`fs:initBackground` 及 preload/types 声明。
- **F3 删除斜杠命令：** `/init` 从 registry 移除；SlashContext 删除 `initBackground`。
- **F4 删除 Agent 章节工具：** 移除 `tools-complex/` 及 tool-executor 分支。
- **F5 删除 Main/Utils 模块：** background-materials、background-init、background-init-ai 整文件删除。
- **F6 文案：** README、WelcomePage 定位为「代码编写 IDE」。
- **F7 单测：** 删除标书相关 UT；更新 slash-commands registry 等用例。

### 非功能需求

- 全量 vitest 通过。
- 不破坏文件树、搜索、Agent diff 确认流程。

---

## 设计决策

### 1. 删除策略

- **选择：** 物理删除文件，非 feature flag。
- **理由：** 与「写代码专用」一致；工作区已有同方向 diff。

### 2. 侧栏 Tab

- **选择：** `SidebarViewBar` 第三项恢复 `scm`（源代码管理）。
- **理由：** 代码 IDE 惯例；ScmPanel 已在 HEAD 保留。

### 3. 用户数据

- **选择：** 不主动删除项目内 `.writcraft/background.json`。
- **理由：** 非阻塞；用户自行清理。

---

## 技术设计

### 文件变更

**删除：**
- `src/components/workbench/BackgroundPanel.vue`
- `src/components/icons/BackgroundMaterialsIcon.vue`
- `electron/main/background-materials.ts`
- `electron/main/background-init.ts`
- `electron/main/background-init-ai.ts`
- `electron/main/agent/tools-complex/`（整目录）
- `src/utils/background-materials.ts`
- `src/utils/background-init.ts`
- `src/utils/background-init-progress.ts`
- `src/slash-commands/init/index.ts`
- `tests/unittest/UT-background-materials/`
- `tests/unittest/UT-background-init/`
- `tests/unittest/UT-background-init-ai/`
- `tests/unittest/UT-agent-complex/`

**修改：**
- `src/App.vue` — 移除 BackgroundPanel；恢复 ScmPanel
- `src/components/workbench/SidebarViewBar.vue` — background → scm
- `src/components/workbench/ChatPane.vue` — 移除 backgroundContextPaths
- `electron/main/fs-ipc.ts` — 删除 background handlers
- `electron/preload/index.ts`、`src/types/writcraft.d.ts` — 删除 API
- `electron/main/agent/agent-tool-defs.ts`、`agent-types.ts`、`tool-executor.ts`
- `src/slash-commands/registry.ts`、`types.ts`
- `README.md`、`WelcomePage.vue`
- `tests/unittest/UT-slash-commands/*.test.ts`

---

## 实施计划

1. **阶段一：删除模块与引用（约 2h）**
   - git rm 标书相关文件；清理 import 与 IPC。
2. **阶段二：单测（约 1h）**
   - 更新 registry 等用例；删除标书 UT 目录。
3. **阶段三：验收（约 1h）**
   - `npm test` 全绿；手工 spot check 侧栏与 Agent。

---

## 测试策略

### 单元测试
- `UT-slash-commands/registry.test.ts`：registry 为空、init 未注册
- 删除 UT-background-*、UT-agent-complex
- 现有 Agent/FS 单测回归

### 手工验收
- 侧栏第三 Tab 为 SCM
- `/init` 无匹配
- Agent 工具列表无 ExpandChapter/SummarizeChapter

---

**路径：** `docs/plans/plan-remove-bid-features.md`

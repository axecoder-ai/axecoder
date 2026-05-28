# 聊天会话按项目落盘（提案 1）设计文档

> 依据：`docs/proposals/proposal-chat.md` **提案 1**、用户反馈「数据量大，不能放 `~/.writcraft/chat-sessions.json`」  
> **范围：** 会话读写改到**当前打开项目**下的 `.writcraft/`；`~/.writcraft` 仍仅存模型/密钥/编辑器配置。  
> **约束：** Renderer 不经 `fs`；IPC 带 `projectRoot`；未打开项目时不读写会话。  
> **不实施：** 本文档仅作计划，代码变更在评审后另 PR 完成。

## 变更范围、约束与时间线

| 项 | 说明 |
|----|------|
| **范围** | `chat-store` 路径与 IPC；`ChatPane` / `AgentsPanel` / `App.vue` 传入 `projectRoot`；打开/切换/关闭项目时会话加载；大体积采用**按会话分文件** |
| **不在范围** | 流式回复、SQLite、会话云同步、跨项目搜索历史、自动把旧 `~/.writcraft` 会话合并进多项目 |
| **约束** | `projectRoot` 必须为绝对路径且通过 `isPathInsideRoot` 类校验；`.writcraft` 仅在该项目树下创建；模型配置仍在 `~/.writcraft` |
| **时间线（估）** | **约 1 人日**（Main 0.5d + Renderer 接线 0.25d + 手工验收 0.25d） |

---

## 当前背景

- **现状：** `electron/main/chat-store.ts` 通过 `writcraftPath('chat-sessions.json')` 写入 **`~/.writcraft/chat-sessions.json`**，所有项目共用一份 JSON，随消息增多单文件膨胀，且与项目无关。
- **已有能力：** `useWorkbench.projectRoot` 在 `fs:openProject` 后可用；`ai:chat` 与模型存储已独立于会话路径。
- **用户诉求：** 会话跟项目走，落在 **`<项目根>/.writcraft/`**，避免占满用户主目录且便于按项目备份/忽略。

---

## 需求

### 功能需求（P0）

- **S1 路径：** 打开项目 `ROOT` 后，会话目录为 `ROOT/.writcraft/sessions/`（自动 `mkdir -p`）。
- **S2 读写：** `chat:getSessions(projectRoot)` / `chat:saveSessions(projectRoot, …)`（或等价批量 API）仅操作该项目目录。
- **S3 未打开项目：** `projectRoot` 为空时返回 `{ sessions: [] }`，聊天区空态提示「请先打开项目」；禁止静默写入 `~/.writcraft`。
- **S4 切换项目：** 切换 `projectRoot` 时卸载旧会话、加载新目录；`activeId` 重置为新项目首条或空。
- **S5 大体积：** 禁止把所有会话塞进一个无限增长的 `chat-sessions.json`；采用 **index + 单会话文件**（见设计决策 2）。

### 非功能需求

- 单会话文件写入为原子写（写临时文件再 `rename`），降低崩溃损坏风险。
- 列表接口只读 index，不加载全部 messages（Agents 侧栏秒开）。

### 不在本期（P2）

- 消息分页、附件、全文检索索引。
- 工作区模板默认 `.gitignore` 写入 `.writcraft/`（可在文档中建议用户自行忽略）。

---

## 设计决策

### 1. 全局 vs 项目目录职责分离

| 位置 | 内容 |
|------|------|
| `~/.writcraft/` | `config.json`、`models.json`、`secrets.json`（不变） |
| `<project>/.writcraft/` | **仅** 聊天会话（及后续项目级 AI 产物） |

- **理由：** 与用户「数据在项目里」一致；模型仍全局复用，避免每项目重复配 Key。

### 2. 存储布局：index + 每会话一文件（推荐）

```
<projectRoot>/.writcraft/
  sessions/
    index.json                 # [{ id, title, updatedAt }]
    <sessionId>.json           # { id, title, updatedAt, messages: [...] }
```

- **选择：** 保存时更新 `index.json` + 覆盖对应 `<id>.json`；加载列表只读 index；进入会话或发送时再读单文件。
- **理由：** 数据量大时避免一次 `JSON.stringify` 整个历史；Agents 列表与单会话编辑解耦。
- **备选（不采用）：** 单文件 `chat-sessions.json` — 实现快但与用户「数据量大」冲突。

### 3. IPC 签名

```ts
// Main
chat:getSessions(projectRoot: string) => { sessions: ChatSessionMeta[] }  // 无 messages 或可选懒加载
chat:getSession(projectRoot: string, sessionId: string) => { session: ChatSession | null }
chat:saveSession(projectRoot: string, session: ChatSession) => { ok: true }
chat:deleteSession(projectRoot: string, sessionId: string) => { ok: true }
```

- **选择：** 拆 `getSession` / `saveSession`，Renderer 发消息只持久化当前会话。
- **理由：** 减少每次发送全量 sessions 数组；与分文件模型一致。
- **兼容：** 可短期保留 `saveSessions` 批量接口供迁移脚本，UI 改完后删除。

### 4. Renderer 接线

- `ChatPane` / `AgentsPanel` 增加 prop：`projectRoot: string`。
- `App.vue` 传入 `wb.projectRoot`；`onProjectOpened` → `chatPane.load()`；清空项目 → `chatPane.reset()`。
- `persist` 改为 `saveSession(projectRoot, activeSession)`，不再 `saveChatSessions(整个数组)`。

### 5. 旧数据 `~/.writcraft/chat-sessions.json`

- **选择：** **不自动迁移**（多项目无法判断归属）；README/设置里一句说明；可选一次性 CLI/菜单「导入到当前项目」（P2）。
- **理由：** 避免误把全局历史写入错误项目。

---

## 技术设计

### 文件变更

| 文件 | 变更 |
|------|------|
| `electron/main/project-writcraft-dir.ts` | **新建** `projectWritcraftDir(root)`、`ensureProjectWritcraftDir(root)` |
| `electron/main/chat-store.ts` | 按 `projectRoot` 读写 `sessions/index.json` 与 `sessions/<id>.json` |
| `electron/main/fs-utils.ts` | 复用/补充 `isPathInsideRoot` 校验 `projectRoot` |
| `electron/preload/index.ts`、`src/types/writcraft.d.ts` | 新 IPC 签名 |
| `src/components/workbench/ChatPane.vue` | `projectRoot` prop；`load`/`send`/`newChat` 调用新 API |
| `src/components/workbench/AgentsPanel.vue` | `projectRoot`；列表用 index |
| `src/App.vue` | 传 `projectRoot`；项目开关事件刷新聊天 |
| `docs/proposals/proposal-chat.md` | 更正「会话在 `~/.writcraft`」描述 |

**不改：** `models-store`、`ai-ipc`、`~/.writcraft` 模型与密钥逻辑。

### 交互流

```
打开项目 ROOT
  → ChatPane.load(ROOT) → 读 ROOT/.writcraft/sessions/index.json
  → 选中 activeId → getSession(ROOT, id) 拉 messages

发送消息
  → ai:chat（全局 modelId）
  → saveSession(ROOT, 当前会话) → 写 <id>.json + 更新 index

切换项目 ROOT2
  → 清空 UI → load(ROOT2)
```

---

## 实施计划

### 步骤 1：Main 项目目录与 chat-store（约 3h）

1. 新建 `project-writcraft-dir.ts`。
2. 实现 `readIndex` / `writeIndex` / `readSession` / `writeSession` / `deleteSession`。
3. 注册新 IPC；`projectRoot` 非法时返回 `{ ok: false, error }`。
4. 为 `chat-store` 增加 vitest（临时目录 + `setWritcraftDirForTests` 模式的项目 override）。

### 步骤 2：preload 与类型（约 0.5h）

1. 更新 `writcraft.d.ts`、`preload/index.ts`。
2. 删除或标记废弃 `getChatSessions` / `saveChatSessions` 无参版本。

### 步骤 3：Renderer（约 2h）

1. `ChatPane`：`projectRoot` 为空显示「请先打开项目」；`load` 读 index + 当前 session。
2. `send` / `newChat` / `closeChat` 调用 `saveSession` / `deleteSession`。
3. `AgentsPanel` 仅展示 index；点击再让 `ChatPane` 加载完整 session。
4. `App.vue` 绑定 `wb.projectRoot` 与 `onProjectOpened` / 关项目清空。

### 步骤 4：文档与验收（约 1h）

1. 更新 `proposal-chat.md` 存储路径说明。
2. 建议用户在项目 `.gitignore` 增加 `.writcraft/`（文档即可）。

**验收（手工）：**

- 项目 A、B 各建会话，互不可见。
- 重启应用后仍从 `A/.writcraft/sessions/` 恢复。
- 未打开项目时无法写入；`~/.writcraft` 下不再生成/更新 `chat-sessions.json`。
- 单会话消息较多时，保存仅改写该会话文件，index 体积保持小。

---

## 测试策略

- **单元：** `chat-store` 在临时项目目录下 CRUD、非法 `projectRoot` 拒绝、原子写。
- **手工：** 双项目隔离、切换项目、关项目空态。

---

## 安全考量

- 校验 `projectRoot` 为存在目录的绝对路径，禁止 `..` 逃逸到项目外写文件。
- 会话 JSON 仅本机磁盘，不经网络（与现网 `ai:chat` 分离）。

---

## 参考资料

- `electron/main/chat-store.ts` — 当前全局路径
- `electron/main/writcraft-dir.ts` — 全局 `~/.writcraft`
- `src/composables/useWorkbench.ts` — `projectRoot`
- `docs/proposals/proposal-chat.md`

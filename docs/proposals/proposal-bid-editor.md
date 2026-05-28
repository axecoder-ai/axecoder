# 解决方案提案：标书编辑工具（WritCraft）

---

## 解决方案提案

**上下文：**
- **请求：** 基于 Electron + TypeScript 构建类 Cursor 的标书撰写桌面应用：三栏可关闭布局、Monaco Markdown 双模式编辑、本地文件树与 glob/grep 检索、可配置多模型的 AI 聊天与选区联动修改；V1 聚焦界面、菜单、文件管理、编辑与 AI 联动，不含导出等扩展。
- **调研来源：** **缺口** — 当前仓库为空，尚无 `/research-codebase` 生成的 `docs/research/*.md`。以下提案依据需求文档与 Electron/Monaco 桌面应用常见实践推导；**建议在选定方案并初始化脚手架后，补跑 `/research-codebase` 以验证 IPC 边界、依赖版本与目录约定。**

---

**提案 1 – Electron 三进程 + Vue 3 工作台（electron-vite 一体化）** ✅ **已选定**

- **概述：** 采用 `electron-vite` 单仓三入口（main / preload / renderer），Renderer 用 **Vue 3**（Composition API + `<script setup>`）实现三栏 IDE 布局与 Monaco 集成，Main 负责 fs、子进程 grep 与窗口菜单；通过 `contextBridge` 暴露受限文件与配置 API。`electron-vite` 提供官方 Vue 模板，与 Vite HMR、Monaco 配合良好，适合 V1 快速落地核心大框。
- **关键变更：**
  - **Main：** `Menu` 模板（文件/编辑/视图/AI/帮助）、`dialog` 打开目录、`fs.promises` 读写、`child_process` 调用 `rg`/`grep` 或内置 `@vscode/ripgrep`；可选 `chokidar` 监听工作区变更。
  - **Preload：** `openFolder`、`readFile`、`writeFile`、`searchFiles`（glob）、`searchContent`（grep）、`get/setAIConfig`（密钥仅存主进程或 `safeStorage`）。
  - **Renderer（Vue 3）：** 左栏文件树（`element-plus` Tree / 自研递归组件 + 虚拟列表）、中栏 `monaco-editor`（可用 `@guolao/vue-monaco-editor` 或封装 `monaco-editor`）+ 预览 Pane（`markdown-it` 渲染至独立 div）、右栏聊天（OpenAI 兼容 `fetch`，流式 SSE）；布局用 CSS Grid/Flex 或 `splitpanes`；Pinia 管理工作区/AI 配置；视图菜单控制左右栏显隐。
  - **AI 联动：** 选区经 `editor.getModel()?.getValueInRange` → IPC 或 Renderer 直连 API → `applyEdit`/`executeEdits` 写回；聊天「插入编辑区」调用 `editor.executeEdits`。
  - **配置：** `electron-store` 或 JSON 存模型 endpoint、model id、apiKey（主进程代理请求可避免 Renderer 暴露密钥，V1 可先主进程 `net.fetch` 转发）。
- **权衡：**
  - **收益：** 上手快、文档多、Monaco 与 Vite HMR 配合好；单仓便于 V1 范围控制。
  - **风险：** Renderer 变重后性能需关注大文件；若 AI 密钥放 Renderer 有泄露面（应用层应用主进程代理缓解）。
  - **契合度：** 高 — 直接覆盖需求中的 Electron、TS、Monaco、glob/grep、多模型配置与三栏布局。
- **验证：**
  - 手工：打开文件夹 → 树展示 → glob 按名过滤 → grep 命中跳转 → Markdown 编辑/预览切换 → 撤销重做 → AI 配置保存 → 聊天插入与选区 AI 写盘。
  - 自动化（可选 V1 后）：Playwright/Spectron 对 Main IPC 契约做集成测试；对 `writeFile` 与编辑器内容一致性做快照测试。
  - **指标：** 千行级 `.md` 打开 &lt; 500ms；grep 万文件目录 &lt; 3s（依赖索引策略）。
- **待解决问题：**
  - 工作区根目录是否单根还是多根（V1 建议单根文件夹）。
  - grep 实现：捆绑 `ripgrep` 二进制 vs 系统 `rg` 依赖。
  - Monaco 预览是否与编辑同源（同步滚动、锚点）— V1 可不做双向同步。
  - 补调研：现有团队是否已有 Electron 内部模板、CI 签名与自动更新策略。

---

**提案 2 – 主进程服务化 + 轻量 Renderer（Vanilla/Preact 面板）**

- **概述：** 同样 Electron + TypeScript，但将「文件 / 检索 / AI 代理 / 配置」沉淀为 Main 内独立服务模块（FileService、SearchService、AIService），Renderer 仅用轻量框架（Preact 或原生 Web Components）拼装三栏，Monaco 以 ESM 动态加载。前期 Main 代码略多，但边界清晰，利于后续加导出、协作、插件而不推倒 UI 层。
- **关键变更：**
  - **Main 服务层：** `FileService`（树构建、读写、监听）、`SearchService`（glob 索引缓存 + ripgrep 队列）、`AIService`（统一 OpenAI-compatible 客户端、流式管道、重试与模型路由）；通过 `ipcMain.handle('service:*')` 单一命名空间暴露。
  - **Preload：** 薄封装，仅转发 `invoke('service:file.read', …)`，禁止 Renderer 直接 `require('fs')`。
  - **Renderer：** 三栏为三个自定义元素或 Preact 组件；Monaco `loader.init` 独立 chunk；聊天 UI 订阅 `AIService` 的 `ReadableStream` 事件；菜单快捷键由 Main `globalShortcut` + `role` 统一注册，减少 Renderer 重复逻辑。
  - **检索：** SearchService 首次打开目录建立文件名索引（内存 Map），内容检索按需 ripgrep，结果带 `file:line:col` 供 Monaco `revealLineInCenter`。
  - **AI 写回：** AIService 返回结构化 `{ range, text }` 补丁，Renderer 只负责 `applyEdit`，持久化由 Main `FileService.write` 在「应用」确认后执行（可做 diff 预览层，V1 可简化为即时写盘）。
- **权衡：**
  - **收益：** 安全与可测试性更好（AI 密钥与 fs 均在 Main）；模块边界利于 V2 插件/导出；Renderer 包体更小。
  - **风险：** V1 交付周期略长于提案 1；团队若不熟悉服务化拆分，易出现过度设计。
  - **契合度：** 中高 — 功能等效，初期工程纪律要求更高。
- **验证：**
  - 单元：对 FileService / SearchService 用临时目录与 fixture 文件测 glob、grep、写入原子性。
  - 契约：IPC schema（如 zod）校验请求/响应；AI mock server 测流式与中断。
  - E2E：与提案 1 相同用户路径；额外验证「AI 请求不经过 Renderer 出网」的网络抓包（可选）。
- **待解决问题：**
  - 服务间错误码与用户可见提示的统一规范。
  - 大文件是否走 Main 流式读还是 Renderer 直读 — 需调研 Monaco 推荐路径（通常 Renderer 持内容，Main 仅持久化）。
  - 是否在 V1 引入 `patch` 预览 UI — 需求写「应用到文件」，可后置。
  - **前置研究：** 对比 `electron-vite` vs `electron-forge` 与服务层目录结构；确定是否引入 `trpc-electron` 等类型安全 IPC（V1 可仅用 typed `ipcMain.handle`）。

---

## 方案对比摘要

| 维度 | 提案 1（Vue 3 工作台） | 提案 2（主进程服务化） |
|------|------------------------|-------------------------|
| V1 交付速度 | 快 | 中等 |
| 与类 Cursor 体验 | 很接近 | 接近，UI 需自研更多 |
| 安全（API Key） | 需刻意主进程代理 | 默认更安全 |
| 后续扩展 | 重构成本可能上升 | 扩展成本较低 |
| 推荐场景 | 验证产品、小团队 | 明确长期演进、重视架构 |

**决定：** 采用 **提案 1**，Renderer 技术栈为 **Vue 3 + TypeScript + electron-vite**。后续可在 Main 侧预留 `services/` 目录，向提案 2 渐进迁移。

---

## 调研缺口与后续动作

1. **必须补跑：** `/research-codebase`（仓库初始化后），产出 `docs/research/research-bid-editor.md`，覆盖：依赖选型版本、目录结构、IPC 表、Monaco 双模式实现参考、开源对标（如 Zettlr、MarkText、Cursor 公开架构线索）。
2. **技术 spike（1–2 天）：** Monaco Markdown 预览切换；`@vscode/ripgrep` 在 Electron 打包体积；`safeStorage` 存 API Key 在各 OS 行为。
3. **产品确认：** 工作区是否仅支持文件夹打开；AI 是否必须离线失败可重试；选区 AI 是「建议 diff」还是「直接覆盖」。

---

## 文档信息

- **路径：** `docs/proposals/proposal-bid-editor.md`
- **关联需求：** 标书编辑工具需求文档（用户提供）
- **状态：** 方案 1 已选定（Vue 3）；待初始化脚手架与补调研

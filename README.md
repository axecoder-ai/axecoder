# AxeCoder

> 代码编写桌面 IDE — Electron + Vue 3 + Monaco，内置 AI Agent 编码助手

AxeCoder 是一个跨平台的桌面代码编辑器，集成了类 Claude Code 的 AI Agent，可以通过对话让 AI 帮你读代码、写代码、执行命令、搜索文件等。AI Agent 拥有完整的工具集（读写文件、执行终端命令、网络搜索、任务管理等），并支持 MCP 协议扩展。

## ✨ 主要特性

- **AI Agent 编码助手** — 支持多轮对话，Agent 可以自动使用工具完成任务，包括读写文件、执行 Shell 命令、搜索代码、管理 Todo 等
- **Claude Code 兼容** — Agent 工具集对齐 Claude Code，支持 Read / Edit / Write / Bash / Grep / Glob / Agent 等核心工具，以及 WebSearch / WebFetch / Task 等扩展工具
- **多模型支持** — 支持 OpenAI、Anthropic、Ollama 等多种 AI 提供商，可自由配置 API 端点和密钥
- **子 Agent 并行** — 支持启动子 Agent 并行探索或执行任务（generalPurpose / explore / plan 三种模式）
- **Plan Mode** — 先规划后执行，Agent 以只读模式分析代码库并制定方案，用户确认后再实施
- **MCP 协议** — 支持 Model Context Protocol，可接入外部工具和数据源
- **Skills & Hooks** — 支持自定义技能（Skills）和钩子函数（PreToolUse / PostToolUse / UserPromptSubmit）
- **Slash Commands** — 内置斜杠命令，快速调用常用操作
- **Agent Checkpoints** — 支持 Agent 操作回退，安全可恢复
- **完善的编辑器** — 基于 Monaco Editor，支持语法高亮、Markdown 编辑与预览
- **文件浏览器** — 侧边栏文件树，支持新建/重命名/删除文件
- **集成终端** — 内置终端，支持在项目目录下执行命令
- **全局搜索** — 基于 ripgrep 的全文搜索，支持在项目中快速查找
- **命令面板** — `Cmd+Shift+P` 快速调用所有功能
- **Git 集成** — 查看 Git 状态和差异
- **会话管理** — 聊天会话持久化，随时切换和恢复对话上下文
- **跨平台** — 支持 macOS 和 Windows

## 🏗️ 技术栈

| 层 | 技术 |
|---|---|
| 桌面框架 | Electron 29 |
| 前端 | Vue 3 + TypeScript |
| 构建工具 | Vite 5 + vite-plugin-electron |
| 编辑器 | Monaco Editor |
| AI 协议 | OpenAI / Anthropic API |
| MCP | @modelcontextprotocol/sdk |
| 搜索 | @vscode/ripgrep |
| 终端 | node-pty |
| 存储 | electron-store |

## 📁 项目结构

```
AxeCoder/
├── src/                          # 渲染进程 (Vue 3 前端)
│   ├── App.vue                   # 主布局 (工作台)
│   ├── main.ts                   # 入口
│   ├── components/
│   │   └── workbench/            # 工作台组件
│   │       ├── ChatPane.vue      # AI 对话面板
│   │       ├── AgentsPanel.vue   # Agent 会话列表
│   │       ├── EditorPane.vue    # 编辑器区域
│   │       ├── FileExplorer.vue  # 文件浏览器
│   │       ├── SearchPanel.vue   # 搜索面板
│   │       ├── BottomPanel.vue   # 底部面板 (终端等)
│   │       ├── TitleBar.vue      # 标题栏
│   │       ├── StatusBar.vue     # 状态栏
│   │       ├── SettingsModal.vue # 设置弹窗
│   │       ├── SettingsPanel.vue # 设置面板
│   │       ├── CommandPalette.vue# 命令面板
│   │       ├── WelcomePage.vue   # 欢迎页
│   │       └── ...
│   ├── composables/              # 组合式 API
│   ├── utils/                    # 工具函数
│   ├── slash-commands/           # 斜杠命令系统
│   └── types/                    # 类型定义
├── electron/                     # 主进程
│   ├── main/
│   │   ├── index.ts              # Electron 主入口
│   │   ├── agent/                # Agent 核心引擎
│   │   │   ├── agent-loop.ts     # Agent 循环主逻辑
│   │   │   ├── agent-types.ts    # Agent 类型定义 (36 种工具)
│   │   │   ├── agent-system-prompt.ts  # 系统提示词
│   │   │   ├── tool-executor.ts  # 工具执行器
│   │   │   ├── agent-tool-defs.ts# 工具定义
│   │   │   ├── agent-permissions.ts    # 权限控制
│   │   │   ├── agent-context-compact.ts# 上下文压缩
│   │   │   ├── agent-checkpoint.ts     # 检查点/回退
│   │   │   ├── agent-mcp.ts      # MCP 支持
│   │   │   ├── agent-hooks.ts    # Hooks 系统
│   │   │   ├── agent-skills.ts   # 技能系统
│   │   │   ├── agent-subagent.ts # 子 Agent
│   │   │   ├── agent-ext-executor.ts    # 扩展执行
│   │   │   └── ...
│   │   ├── ai/                   # AI 通信层
│   │   │   ├── providers/        # openai / anthropic / ollama
│   │   │   ├── chat-with-tools.ts
│   │   │   └── ...
│   │   ├── fs-ipc.ts             # 文件系统 IPC
│   │   ├── git-ipc.ts            # Git IPC
│   │   ├── terminal-ipc.ts       # 终端 IPC
│   │   ├── agent-ipc.ts          # Agent IPC
│   │   ├── models-ipc.ts         # 模型管理 IPC
│   │   ├── config-store.ts       # 配置存储
│   │   └── secrets-store.ts      # 密钥存储
│   └── preload/                  # 预加载脚本
└── package.json
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18
- pnpm (推荐) 或 npm

### 安装与运行

```bash
# 克隆仓库
git clone <repo-url>
cd AxeCoder

# 安装依赖
pnpm install

# 启动开发模式
pnpm dev
```

### 构建

```bash
# 类型检查 + 构建 + 打包
pnpm build
```

构建产物输出到 `release/` 目录。

## 🎯 使用指南

### 配置 AI 模型

1. 启动应用后，点击标题栏的模型设置按钮
2. 添加模型配置：
   - **OpenAI**：填写 API Endpoint + API Key + 模型名称（如 `gpt-4o`）
   - **Anthropic**：填写 API Key + 模型名称（如 `claude-sonnet-4-20250514`）
   - **Ollama**：填写本地 Ollama 地址 + 模型名称
3. 保存后即可在聊天面板中选择模型

### 使用 AI Agent

1. 打开一个项目文件夹（`Cmd+O`）
2. 在右侧聊天面板中输入你的需求，例如：
   - "帮我重构这个文件"
   - "在项目中找到所有未使用的导入"
   - "给这个函数写单元测试"
3. Agent 会自动调用工具来完成任务
4. 对于文件写入和命令执行操作，需要你确认后才会执行（也可在设置中开启自动应用）

### 快捷键

| 快捷键 | 功能 |
|---|---|
| `Cmd/Ctrl + O` | 打开项目 |
| `Cmd/Ctrl + Shift + O` | 打开文件 |
| `Cmd/Ctrl + N` | 新建文件 |
| `Cmd/Ctrl + S` | 保存文件 |
| `Cmd/Ctrl + W` | 关闭标签 |
| `Cmd/Ctrl + F` | 查找 |
| `Cmd/Ctrl + Shift + F` | 在项目中查找 |
| `Cmd/Ctrl + Shift + P` | 命令面板 |
| `Cmd/Ctrl + Shift + C` | 切换 AI 面板 |
| `Cmd/Ctrl + \`` | 切换终端 |

### Agent 工具集

Agent 拥有以下核心工具：

| 工具 | 说明 |
|---|---|
| `Read` | 读取文件内容 |
| `Edit` | 精确编辑文件 |
| `Write` | 创建/覆盖文件 |
| `Glob` | 按模式搜索文件 |
| `Grep` | 搜索文件内容 |
| `Delete` | 删除文件/目录 |
| `Move` | 移动/重命名文件 |
| `Bash` | 执行终端命令 |
| `Agent` | 启动子 Agent |
| `AskUserQuestion` | 向用户提问 |

扩展工具：`TodoWrite`、`Task*`、`WebFetch`、`WebSearch`、`Skill`、`MCP` 等共 36 种。

## ⚙️ 配置

通过设置面板（`Cmd+,`）可以配置：

- **编辑器**：字体大小、主题
- **自动保存**：开关和延迟时间
- **Agent 权限**：允许/禁止特定工具、自动应用写入
- **Agent 行为**：主动提醒、上下文压缩阈值、Plan Mode
- **输出风格**：自定义 Agent 回复风格
- **Hooks**：启用/禁用 hooks 系统

## 📄 License

MIT License — 详见 [LICENSE](./LICENSE)

# AxeCoder

> Desktop IDE for coding — Electron + Vue 3 + Monaco, with a built-in AI Agent coding assistant

AxeCoder is a cross-platform desktop code editor with a Claude Code–style AI Agent. Chat with the AI to read code, write code, run commands, search files, and more. The Agent has a full toolset (read/write files, run terminal commands, web search, task management, etc.) and supports MCP protocol extensions.

## ✨ Key Features

- **AI Agent coding assistant** — Multi-turn conversations; the Agent automatically uses tools to complete tasks, including read/write files, run Shell commands, search code, manage Todos, and more
- **Claude Code compatible** — Agent tools aligned with Claude Code: Read / Edit / Write / Bash / Grep / Glob / Agent, plus WebSearch / WebFetch / Task and other extensions
- **Multi-model support** — OpenAI, Anthropic, Ollama, and other providers; freely configure API endpoints and keys
- **Parallel sub-agents** — Launch sub-agents to explore or execute tasks in parallel (generalPurpose / explore / plan modes)
- **Plan Mode** — Plan first, execute later; the Agent analyzes the codebase in read-only mode and proposes a plan before implementation
- **MCP protocol** — Model Context Protocol support for external tools and data sources
- **Skills & Hooks** — Custom Skills and hooks (PreToolUse / PostToolUse / UserPromptSubmit)
- **Slash Commands** — Built-in slash commands for quick actions
- **Agent Checkpoints** — Roll back Agent actions for safe recovery
- **Full-featured editor** — Monaco Editor with syntax highlighting, Markdown editing and preview
- **File explorer** — Sidebar file tree with create/rename/delete
- **Integrated terminal** — Built-in terminal for running commands in the project directory
- **Global search** — ripgrep-based full-text search across the project
- **Command palette** — `Cmd+Shift+P` to access all features
- **Git integration** — View Git status and diffs
- **Session management** — Persistent chat sessions; switch and restore conversation context anytime
- **Cross-platform** — macOS and Windows

## 🏗️ Tech Stack


| Layer    | Technology                    |
| -------- | ----------------------------- |
| Desktop  | Electron 29                   |
| Frontend | Vue 3 + TypeScript            |
| Build    | Vite 5 + vite-plugin-electron |
| Editor   | Monaco Editor                 |
| AI       | OpenAI / Anthropic API        |
| MCP      | @modelcontextprotocol/sdk     |
| Search   | @vscode/ripgrep               |
| Terminal | node-pty                      |
| Storage  | electron-store                |


## 📁 Project Structure

```
AxeCoder/
├── src/                          # Renderer (Vue 3 frontend)
│   ├── App.vue                   # Main layout (workbench)
│   ├── main.ts                   # Entry point
│   ├── components/
│   │   └── workbench/            # Workbench components
│   │       ├── ChatPane.vue      # AI chat panel
│   │       ├── AgentsPanel.vue   # Agent session list
│   │       ├── EditorPane.vue    # Editor area
│   │       ├── FileExplorer.vue  # File explorer
│   │       ├── SearchPanel.vue   # Search panel
│   │       ├── BottomPanel.vue   # Bottom panel (terminal, etc.)
│   │       ├── TitleBar.vue      # Title bar
│   │       ├── StatusBar.vue     # Status bar
│   │       ├── SettingsModal.vue # Settings modal
│   │       ├── SettingsPanel.vue # Settings panel
│   │       ├── CommandPalette.vue# Command palette
│   │       ├── WelcomePage.vue   # Welcome page
│   │       └── ...
│   ├── composables/              # Composables
│   ├── utils/                    # Utilities
│   ├── slash-commands/           # Slash command system
│   └── types/                    # Type definitions
├── electron/                     # Main process
│   ├── main/
│   │   ├── index.ts              # Electron main entry
│   │   ├── agent/                # Agent core engine
│   │   │   ├── agent-loop.ts     # Agent loop logic
│   │   │   ├── agent-types.ts    # Agent types (36 tools)
│   │   │   ├── agent-system-prompt.ts  # System prompt
│   │   │   ├── tool-executor.ts  # Tool executor
│   │   │   ├── agent-tool-defs.ts# Tool definitions
│   │   │   ├── agent-permissions.ts    # Permissions
│   │   │   ├── agent-context-compact.ts# Context compaction
│   │   │   ├── agent-checkpoint.ts     # Checkpoints / rollback
│   │   │   ├── agent-mcp.ts      # MCP support
│   │   │   ├── agent-hooks.ts    # Hooks system
│   │   │   ├── agent-skills.ts   # Skills system
│   │   │   ├── agent-subagent.ts # Sub-agents
│   │   │   ├── agent-ext-executor.ts    # Extended execution
│   │   │   └── ...
│   │   ├── ai/                   # AI communication layer
│   │   │   ├── providers/        # openai / anthropic / ollama
│   │   │   ├── chat-with-tools.ts
│   │   │   └── ...
│   │   ├── fs-ipc.ts             # Filesystem IPC
│   │   ├── git-ipc.ts            # Git IPC
│   │   ├── terminal-ipc.ts       # Terminal IPC
│   │   ├── agent-ipc.ts          # Agent IPC
│   │   ├── models-ipc.ts         # Model management IPC
│   │   ├── config-store.ts       # Config storage
│   │   └── secrets-store.ts      # Secrets storage
│   └── preload/                  # Preload scripts
└── package.json
```

## 🚀 Quick Start

### Requirements

- Node.js >= 18
- pnpm (recommended) or npm

### Install & Run

```bash
# Clone the repo
git clone https://github.com/axecoder-ai/axecoder.git
cd AxeCoder

# Install dependencies
pnpm install

# Start dev mode
pnpm dev
```

### Build

```bash
# Type check + build + package
pnpm build
```

Build output goes to the `release/` directory.

## 🎯 Usage

### Configure AI Models

1. After launching the app, click the model settings button in the title bar
2. Add a model configuration:
  - **OpenAI**: API Endpoint + API Key + model name (e.g. `gpt-4o`)
  - **Anthropic**: API Key + model name (e.g. `claude-sonnet-4-20250514`)
  - **Ollama**: Local Ollama URL + model name
3. Save, then select the model in the chat panel

### Use the AI Agent

1. Open a project folder (`Cmd+O`)
2. Enter your request in the chat panel on the right, for example:
  - "Refactor this file for me"
  - "Find all unused imports in the project"
  - "Write unit tests for this function"
3. The Agent will call tools automatically to complete the task
4. File writes and command execution require your confirmation (or enable auto-apply in settings)

### Keyboard Shortcuts


| Shortcut               | Action          |
| ---------------------- | --------------- |
| `Cmd/Ctrl + O`         | Open project    |
| `Cmd/Ctrl + Shift + O` | Open file       |
| `Cmd/Ctrl + N`         | New file        |
| `Cmd/Ctrl + S`         | Save file       |
| `Cmd/Ctrl + W`         | Close tab       |
| `Cmd/Ctrl + F`         | Find            |
| `Cmd/Ctrl + Shift + F` | Find in project |
| `Cmd/Ctrl + Shift + P` | Command palette |
| `Cmd/Ctrl + Shift + C` | Toggle AI panel |
| `Cmd/Ctrl + `          | Toggle terminal |


### Agent Tools

Core tools:


| Tool              | Description              |
| ----------------- | ------------------------ |
| `Read`            | Read file contents       |
| `Edit`            | Precise file edits       |
| `Write`           | Create/overwrite files   |
| `Glob`            | Search files by pattern  |
| `Grep`            | Search file contents     |
| `Delete`          | Delete files/directories |
| `Move`            | Move/rename files        |
| `Bash`            | Run terminal commands    |
| `Agent`           | Launch sub-agent         |
| `AskUserQuestion` | Ask the user a question  |


Extended tools: `TodoWrite`, `Task`*, `WebFetch`, `WebSearch`, `Skill`, `MCP`, and more — 36 tools in total.

## ⚙️ Configuration

Use the settings panel (`Cmd+,`) to configure:

- **Editor**: Font size, theme
- **Auto-save**: On/off and delay
- **Agent permissions**: Allow/deny specific tools, auto-apply writes
- **Agent behavior**: Proactive reminders, context compaction threshold, Plan Mode
- **Output style**: Custom Agent reply style
- **Hooks**: Enable/disable the hooks system

## 📄 License

MIT License — see [LICENSE](./LICENSE)
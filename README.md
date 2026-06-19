# AxeCoder

> Desktop IDE for coding — Electron + Vue 3 + Monaco, with a built-in AI Agent coding assistant

AxeCoder is a cross-platform desktop code editor built around a **Claude Code–style AI Agent**. Open a project, chat with the model, and let the Agent read/write files, run commands, search the codebase, and coordinate sub-agents — all from a VS Code–like workbench. Beyond single-agent coding, it ships **Draw.IO** (AI diagrams via next-ai-draw-io) and **Software Co.** (MetaGPT-style multi-role SOP for PRD → code → QA). Built-in **AI Performance** and **AI Request Trace** panels give you real-time visibility into latency, token usage, and every model/tool call.

## 📸 Screenshots

**Workbench & Agent session** — editor, file tree, unified session list, streaming tool cards, and bottom Trace tab in one layout. Supports Agent, Draw.IO, Multi-Agent, and Software Co. sessions side by side.

![AxeCoder workbench with AI Agent session](./docs/assets/workbench-agent-session.png)

**AI Request Trace** — record and replay the full Agent timeline: prompts, model replies, tool calls, and results. Dock in the bottom panel or pop out to a dedicated window; export logs as JSONL.

![AI Request Trace panel](./docs/assets/ai-request-trace.png)

**AI Performance** — live dashboards for TTFT, E2E latency, TPS, QPS, error rate, and token throughput. Filter by model/provider/source; jump from a model row to its Trace entries.

![AI Performance dashboard](./docs/assets/ai-performance-dashboard.png)

## ✨ Key Features

### AI Agent

- **42 built-in tools** — Claude Code–aligned core set (Read / Edit / Write / Bash / Grep / Glob / Agent / Task …) plus extensions: WebSearch, WebFetch, LSP, MCP, Skills, Plan Mode, worktree helpers, and more
- **Multi-turn agent loop** — automatic tool use with permission prompts, checkpoints/rollback, context compaction, and loop-guard against runaway calls
- **Parallel sub-agents** — spawn `generalPurpose` / `explore` / `plan` sub-agents to research or execute in parallel
- **Workshop (embedded modes)** — three chat modes share a split-pane layout (chat + workspace):
  - **Draw.IO** — AI-assisted diagrams (ported from [next-ai-draw-io](https://github.com/DayuanJiang/next-ai-draw-io)); embedded draw.io canvas with `DisplayDiagram` / `EditDiagram` / `GetDiagram` tools
  - **Multi-Agent** — role-based turn-taking collaboration with step progress and streaming output
  - **Software Co.** — MetaGPT-style SOP pipeline: one-line requirement → PRD → design → tasks → implement → QA → delivery; structured artifacts, Message Pool, per-role tool profiles, and automatic test feedback loops
- **Plan Mode** — read-only analysis first, then implement after you approve the plan
- **Output styles** — Default, Explanatory, or Learning reply modes

### Code Intelligence

- **Native CodeGraph** — tree-sitter + SQLite code knowledge graph embedded in the main process; Agent tools `CodeGraphExplore` / `CodeGraphSearch` / `CodeGraphNode` for structural navigation without endless Grep+Read
- **LSP tool** — query language servers for definitions, references, diagnostics, and more
- **Monaco Editor** — syntax highlighting, Markdown edit/preview, diff view, document preview (Word/PDF)

### AI Observability

- **AI Performance monitor** — TitleBar chart icon opens the metrics tab; detachable window for a dedicated dashboard
- **AI Request Trace recorder** — TitleBar record button captures every chat/Agent request; inspect, filter, save, or clear traces
- **Metrics ↔ Trace linkage** — click a model in the performance table to jump to matching trace entries

### IDE & Workflow

- **Flexible layout** — resizable sidebar/editor/chat; **dual-window mode** pops the chat/session panel to a companion window (great on a second monitor)
- **Unified session list** — Agent and Workshop sessions in one sidebar; persistent history per project
- **File explorer & global search** — ripgrep-powered project search with replace
- **Integrated terminal** — xterm.js terminal in the bottom panel
- **Git integration** — SCM panel, status, and diffs; optional Git host settings
- **Command palette & Quick Open** — `Cmd+Shift+P` and `Cmd+P` style navigation
- **Slash commands** — built-in and project-level custom commands
- **i18n & themes** — English/Chinese UI; VS Code, Aura Light, and Aura Dark themes

### Extensibility

- **Multi-model** — OpenAI, Anthropic, Ollama, and custom endpoints; per-user model profiles
- **MCP protocol** — connect external tools and data sources via Model Context Protocol
- **Skills & Hooks** — custom Skills plus PreToolUse / PostToolUse / UserPromptSubmit hooks
- **Rules & permissions** — project/user rules, tool allow/deny lists, OS sandbox option, auto-apply writes toggle

## 🏗️ Tech Stack

| Layer       | Technology                              |
| ----------- | --------------------------------------- |
| Desktop     | Electron 29                             |
| Frontend    | Vue 3 + TypeScript                      |
| Build       | Vite 5 + vite-plugin-electron           |
| Editor      | Monaco Editor                           |
| Terminal    | xterm.js + node-pty                     |
| AI          | OpenAI / Anthropic / Ollama APIs        |
| CodeGraph   | tree-sitter + better-sqlite3 (in-process) |
| MCP         | @modelcontextprotocol/sdk               |
| Search      | @vscode/ripgrep                         |
| Storage     | electron-store                          |

## 📁 Project Structure

```
AxeCoder/
├── src/                              # Renderer (Vue 3 frontend)
│   ├── App.vue                       # Workbench shell & window roles
│   ├── components/workbench/
│   │   ├── ChatPane.vue              # Agent / Workshop chat
│   │   ├── AgentsPanel.vue           # Unified session sidebar
│   │   ├── WorkshopChatSection.vue   # Workshop UI (Multi-Agent / Draw.IO / Software Co.)
│   │   ├── DrawIoEmbed.vue           # Embedded draw.io canvas
│   │   ├── WorkshopSopProgress.vue   # SOP phase & task progress bar
│   │   ├── EditorPane.vue            # Monaco editor area
│   │   ├── AiMetricsPanel.vue        # AI Performance dashboard
│   │   ├── AiTracePanel.vue          # AI Request Trace recorder
│   │   ├── BottomPanel.vue           # Terminal, output, metrics, trace
│   │   ├── SettingsPanel.vue         # Settings (models, users, rules…)
│   │   └── ...
│   ├── composables/                  # useWorkbench, etc.
│   ├── slash-commands/               # Slash command system
│   └── i18n/                         # Localization
├── electron/main/
│   ├── agent/                        # Agent loop, tools, MCP, skills, hooks
│   ├── draw-io/                      # Draw.IO diagram engine (next-ai-draw-io port)
│   ├── sop/                          # Software Co. SOP pipeline, Message Pool, QA loop
│   ├── codegraph/                    # Vendored CodeGraph engine
│   ├── ai/                           # Providers & chat-with-tools
│   ├── ai-metrics-store.ts           # Performance metrics ring buffer
│   ├── ai-trace-store.ts             # Request trace recorder
│   └── …                             # fs/git/terminal/agent IPC
├── docs/assets/                      # README screenshots
└── package.json
```

## 🚀 Quick Start

### Requirements

- Node.js >= 18
- pnpm (recommended) or npm

### Install & Run

```bash
git clone https://github.com/axecoder-ai/axecoder.git
cd AxeCoder
pnpm install
pnpm dev
```

### Build

```bash
pnpm build
```

Build output goes to `release/`.

## 🎯 Usage

### Configure AI Models

1. Open **Settings → Models** (or the model button in the title bar)
2. Add a provider:
   - **OpenAI** — API endpoint + key + model (e.g. `gpt-4o`)
   - **Anthropic** — API key + model (e.g. `claude-sonnet-4-20250514`)
   - **Ollama** — local URL + model name
3. Pick the model in the chat composer; switch effort/mode as needed

### Use the AI Agent

1. Open a project folder (`Cmd+O`)
2. Type a task in the chat panel — e.g. refactor a file, find dead code, write tests
3. Approve file writes and shell commands (or enable **auto-apply** in Settings → General)
4. Use `/` for slash commands; `@` to reference files; spawn sub-agents for parallel work

### Workshop Modes

Workshop sessions use a **split layout**: chat on the left, mode-specific workspace on the right. Pick a mode from the chat composer before the first message (Agent / Plan / Draw.IO / Multi-Agent / Software Co.).

#### Draw.IO (AI Diagrams)

1. Select **Draw.IO** mode in the chat composer
2. Describe the diagram in natural language — e.g. "draw a microservices architecture with API gateway"
3. The Agent uses built-in diagram tools to update the canvas in real time; `diagramXml` is persisted in the session
4. Requires network access to `embed.diagrams.net` (same as upstream next-ai-draw-io)

#### Multi-Agent

1. Select **Multi-Agent** mode
2. Built-in roles (Manager, Researcher, Developer, etc.) discuss and execute in turn with visible step progress
3. Coordinator routes tasks dynamically across roles

#### Software Co. (MetaGPT-style)

1. Select **Software Co.** mode and describe a software requirement in one line
2. The SOP pipeline runs automatically through phases: **requirement → PRD → design → tasks → implement → QA → done**
3. Each phase is handled by a dedicated role (Product Analyst, Architect, Project Manager, Developer, QA Engineer, …) with role-specific tool profiles
4. Structured deliverables land under `docs/deliverables/{slug}/_artifacts/`; a **Message Pool** passes artifacts between roles with `causeBy` metadata
5. Implementation runs **task-by-task** with shell-based test feedback; QA failures loop back to Developer (up to 3 rounds)
6. Watch the **SOP progress bar** for phase and per-task status in the chat panel

### Monitor AI Calls

| Action | How |
| ------ | --- |
| Open **AI Performance** | TitleBar chart icon → bottom **Metrics** tab (or detach to its own window) |
| Open **AI Request Trace** | TitleBar record dot → bottom **Trace** tab; click **Start recording** before chatting |
| Save trace log | Stop recording → **Save log** (stored under app data `ai-traces/`) |
| Dual-window chat | TitleBar dual-window button → companion window for sessions only |

### Keyboard Shortcuts

| Shortcut               | Action              |
| ---------------------- | ------------------- |
| `Cmd/Ctrl + O`         | Open project        |
| `Cmd/Ctrl + Shift + O` | Open file           |
| `Cmd/Ctrl + N`         | New file            |
| `Cmd/Ctrl + S`         | Save file           |
| `Cmd/Ctrl + W`         | Close tab           |
| `Cmd/Ctrl + F`         | Find                |
| `Cmd/Ctrl + Shift + F` | Find in project     |
| `Cmd/Ctrl + Shift + P` | Command palette     |
| `Cmd/Ctrl + Shift + C` | Toggle AI panel     |
| `Cmd/Ctrl + \``         | Toggle terminal     |
| `Cmd/Ctrl + ,`         | Settings            |

### Agent Tools (highlights)

| Category | Tools |
| -------- | ----- |
| Files | `Read`, `Edit`, `Write`, `Glob`, `Grep`, `Delete`, `Move` |
| Shell & tasks | `Bash`, `TodoWrite`, `Task`*, `TaskCreate` / `Get` / `Update` / `List` |
| Agents | `Agent`, `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode` |
| Web | `WebSearch`, `WebFetch` |
| Code intelligence | `LSP`, `CodeGraphExplore`, `CodeGraphSearch`, `CodeGraphNode` |
| Diagrams (Draw.IO) | `DisplayDiagram`, `EditDiagram`, `GetDiagram` |
| Extensions | `Skill`, `DiscoverSkills`, `CallMcpTool`, `McpAuth`, `ListMcpResources`, `ReadMcpResource`, `NotebookEdit`, `EnterWorktree`, `ExitWorktree`, … |

\*42 tools total — see `electron/main/agent/agent-types.ts` for the full list.

## ⚙️ Configuration

Open **Settings** (`Cmd+,`):

| Tab | What you can configure |
| --- | ---------------------- |
| **General** | Theme, locale, editor font/auto-save, agent auto-apply, OS sandbox, loop guard, max tool rounds, output style, Git host |
| **Models** | Provider endpoints, API keys, model tiers |
| **Users** | Multi-user profiles with per-user model access |
| **Permissions** | Tool allow/deny rules per project |
| **Rules, Skills, Subagents** | Project rules, custom skills, subagent definitions |

## 📄 License

MIT License — see [LICENSE](./LICENSE).

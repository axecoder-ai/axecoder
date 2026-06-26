# AxeCoder 终端 Readline 快捷键支持

## 背景

AxeCoder 工作台底部集成了基于 xterm.js + node-pty 的嵌入式终端。用户反馈当前无法使用 **Ctrl+R** 进行历史命令的反向增量搜索（reverse-i-search），体验与系统原生终端（Terminal.app、iTerm2、VS Code 集成终端等）不一致。

经初步分析，可能原因包括：

- Electron 菜单中 `reload` 角色占用了 **Cmd/Ctrl+R**，在终端聚焦时拦截了该快捷键
- xterm.js 或前端层未将部分控制键正确转发给 PTY/shell

用户希望终端在聚焦时具备与原生 shell 一致的行编辑（readline）能力，而不仅是修复单个 Ctrl+R。

## 目标

当终端面板可见且终端获得焦点时，键盘快捷键应传递给底层 shell 的 readline/行编辑层处理，行为与用户在系统默认 shell 中的体验一致。

## 功能要求

### 1. Ctrl+R 反向历史搜索

- 按下 **Ctrl+R** 进入反向增量搜索模式（`(reverse-i-search)`）
- 继续输入字符可逐步缩小匹配范围
- 按 **Enter** 执行匹配到的命令
- 按 **Esc** 或 **Ctrl+G** 取消搜索
- 行为与 bash/zsh 的 reverse-i-search 一致

### 2. 完整 Readline 快捷键支持

除 Ctrl+R 外，终端聚焦时应支持常见 readline 快捷键，包括但不限于：

| 快捷键 | 预期行为 |
|--------|----------|
| Ctrl+R | 反向增量搜索历史 |
| Ctrl+S | 正向增量搜索（或在 reverse search 中切换方向） |
| Ctrl+A | 光标移到行首 |
| Ctrl+E | 光标移到行尾 |
| Ctrl+K | 删除光标到行尾 |
| Ctrl+U | 删除光标到行首 |
| Ctrl+W | 删除前一个词 |
| Ctrl+L | 清屏 |
| Ctrl+C | 中断当前命令（已有基础支持，需保持） |

具体键位以系统默认 shell 的 readline 配置为准；AxeCoder 不应自行实现一套替代逻辑，而应确保按键能到达 shell。

### 3. 生效范围

- **仅当**底部终端面板可见 **且** 终端（xterm）获得键盘焦点时，上述快捷键交给 shell 处理
- 终端未聚焦或面板不可见时，不改变现有全局快捷键行为

### 4. 与「刷新页面」的冲突处理

- 终端聚焦时：**Ctrl+R 优先给终端/shell 使用**，不触发页面刷新
- 终端未聚焦时：保留现有刷新能力（菜单等方式仍可刷新）
- 不要求全局废除 Ctrl+R 刷新，仅在终端聚焦场景让位

### 5. Shell 兼容性

- 使用 AxeCoder 当前逻辑：按平台启动系统默认 shell
  - macOS：`$SHELL`（通常 zsh）+ login shell
  - Windows：`COMSPEC`（通常 cmd.exe）
  - Linux：`$SHELL`（通常 bash/zsh）
- 验收标准：**行为与在同一 shell 的原生终端中一致**，不强制对所有 shell 做专项适配
- 不要求 AxeCoder 自行维护命令历史存储；历史由 shell 管理

## 非功能要求

### 平台

- **macOS** 与 **Windows/Linux** 均需支持
- macOS 上使用 **Ctrl+R**（非 Cmd+R），与主流 IDE 集成终端习惯一致

### 体验

- 无额外 UI 弹窗或自定义历史面板；搜索提示由 shell 在终端内渲染（如 `(reverse-i-search)\`cmd\`: `）
- 切换项目根目录、终端 tab 显隐、窗口 resize 后，快捷键行为不受影响
- 不应破坏现有终端输入、输出、滚动、主题等功能

### 可验证性

验收时可在终端聚焦状态下验证：

1. Ctrl+R 能进入 reverse-i-search 并找到历史命令
2. Ctrl+A/E、Ctrl+K/U 等行编辑正常
3. 终端聚焦时 Ctrl+R 不刷新 AxeCoder 页面
4. 点击编辑器等其他区域后，Ctrl+R 恢复原有全局行为（若适用）

## 范围外（明确不做）

- 不实现自定义历史命令 UI/面板
- 不跨 session 同步或持久化命令历史（由 shell 负责）
- 不要求 fish、PowerShell 等非默认 shell 的专项测试与适配
- 不涉及 Agent 自动执行命令时的历史搜索（仅面向用户手动操作的嵌入式终端）

## 相关代码位置（供实现参考，非方案）

- 前端终端组件：`src/components/workbench/TerminalView.vue`
- 主进程 PTY：`electron/main/terminal-ipc.ts`
- Electron 菜单（含 reload 快捷键）：`electron/main/index.ts`

---

*文档由需求澄清流程生成，仅描述「要什么」，不包含具体技术方案。*

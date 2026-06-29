# 调研来源

| 文档 / 模块 | 说明 |
|-------------|------|
| `features/功能清单.md` §2.1、§8 | 工作台壳层与扩展/Companion 现状 |
| `features/页面布局与按钮.md` §13 | Workbench Vue 组件索引 |
| `src/App.vue` | 硬编码导入 15+ 面板组件、布局状态与命令分发 |
| `src/components/workbench/SidebarViewBar.vue` | 侧栏 Tab 硬编码 `items` 数组 |
| `src/components/workbench/ActivityBar.vue` | 活动栏硬编码（当前 App 未挂载，但同类模式） |
| `src/components/workbench/BottomPanel.vue` | 底栏 Tab 硬编码 terminal/output/problems/metrics/trace |
| `src/utils/command-registry.ts` | 运行时 `registerCommand` / `setupWorkbenchCommands`，非扩展贡献 |
| `src/components/workbench/ExtensionsPanel.vue` | 占位：「V1, no third-party extension marketplace」 |
| `extensions/axecoder/package.json` `contributes` | 已有 VS Code 贡献点声明（commands/views/keybindings/themes 子集） |
| `extensions/axecoder/src/host/`、`out/host/vscode-host.js` | VS Code API 模拟层（Companion 模式） |
| `src/types/axecoder.d.ts` `AppTheme` | 主题枚举硬编码：vscode / aura-light / aura-dark / claude |

**调研缺口：** 无专门「workbench 贡献点」设计文档；`vscode-host` 源码路径与 Companion 运行时耦合关系需实现阶段再核对。

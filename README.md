# WritCraft

标书撰写桌面工具（Electron + TypeScript + Vue 3 + Monaco Editor）。

## 开发

```bash
# 若 Electron 下载失败，可先设置镜像
export ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"
npm install
npm run dev
```

界面为 Cursor 风格三栏工作台：活动栏、文件树、Monaco 编辑区、AI 聊天区、Agents 侧栏。

技术选型见 `docs/proposals/proposal-bid-editor.md`。

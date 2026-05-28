---
name: kill-writcraft-processes
description: Terminates WritCraft dev and app processes (Vite dev server, project Electron, packaged app) without killing unrelated Electron apps like Cursor. Use when the user asks to kill/stop WritCraft or Electron dev processes, port 3344 is stuck, or dev instances need a clean restart.
---

# 杀掉 WritCraft / 项目 Electron 进程

## 何时使用

用户提到：杀掉 Electron、杀掉 WritCraft、清进程、端口占用、dev 关不掉、重启前先杀进程。

## 禁止做法

**不要**执行 `pkill Electron`、`killall Electron` 等全局命令——会误杀 Cursor、Slack 等其它 Electron 应用。

## 推荐做法

在项目根目录执行脚本（只匹配本项目路径与端口）：

```bash
bash .cursor/skills/kill-writcraft-processes/scripts/kill.sh
```

执行后简要汇报：哪些模式被匹配、是否仍有残留（可用 `pgrep -fl WritCraft` 自查）。

## 手动兜底（脚本无效时）

按顺序尝试，仍避免全局 Electron：

```bash
lsof -ti:3344 | xargs kill -9 2>/dev/null
pkill -f "WritCraft/node_modules/electron" 2>/dev/null
pkill -f "workspace/WritCraft.*vite" 2>/dev/null
killall WritCraft 2>/dev/null
```

## 验证

勿用宽泛的 `pgrep WritCraft`（会匹配 Cursor 工作区进程）。用：

```bash
pgrep -fl "WritCraft/node_modules/electron|WritCraft/dist-electron|WritCraft.app" || echo "无应用/dev 进程"
lsof -i:3344 || echo "3344 端口空闲"
```

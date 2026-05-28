#!/usr/bin/env bash
# 只杀 WritCraft 相关进程，不杀全局 Electron

set -e

echo "=== 杀掉 WritCraft / 项目 Electron 进程 ==="

# 1. Vite 开发服（package.json debug 端口 3344）
port=3344
pids=$(lsof -ti:"$port" 2>/dev/null || true)
if [ -n "$pids" ]; then
  echo "结束占用 :$port 的进程: $pids"
  kill $pids 2>/dev/null || kill -9 $pids 2>/dev/null || true
else
  echo ":$port 无进程"
fi

# 2. 本项目 node_modules 里的 Electron（dev）
if pgrep -f "WritCraft/node_modules/electron" >/dev/null 2>&1; then
  echo "结束 WritCraft/node_modules/electron"
  pkill -f "WritCraft/node_modules/electron" 2>/dev/null || true
  sleep 0.3
  pkill -9 -f "WritCraft/node_modules/electron" 2>/dev/null || true
else
  echo "无 dev Electron 进程"
fi

# 3. 本项目 vite 子进程
if pgrep -f "workspace/WritCraft" >/dev/null 2>&1; then
  echo "结束 workspace/WritCraft 下 vite/node 残留"
  pkill -f "workspace/WritCraft.*vite" 2>/dev/null || true
  pkill -f "workspace/WritCraft/node_modules/.bin/vite" 2>/dev/null || true
fi

# 4. 已打包应用名
if pgrep -x WritCraft >/dev/null 2>&1; then
  echo "结束 WritCraft 应用"
  killall WritCraft 2>/dev/null || true
fi
if pgrep -f "WritCraft.app" >/dev/null 2>&1; then
  pkill -f "WritCraft.app" 2>/dev/null || true
fi

# 5. dist-electron 直接运行残留
if pgrep -f "WritCraft/dist-electron" >/dev/null 2>&1; then
  echo "结束 dist-electron 进程"
  pkill -f "WritCraft/dist-electron" 2>/dev/null || true
fi

echo ""
echo "=== 剩余检查（不含 Cursor 等其它 Electron）==="
left=$(pgrep -fl "WritCraft/node_modules/electron|WritCraft/dist-electron|WritCraft.app|workspace/WritCraft.*vite" 2>/dev/null || true)
if [ -n "$left" ]; then
  echo "$left"
  echo "仍有残留，可手动 kill -9 <pid>"
else
  echo "无 WritCraft 应用/dev 进程"
fi

port_left=$(lsof -ti:"$port" 2>/dev/null || true)
if [ -n "$port_left" ]; then
  echo ":$port 仍被占用: $port_left"
else
  echo ":$port 已释放"
fi

/**
 * Agent Worker 子进程入口（由主进程 fork，ELECTRON_RUN_AS_NODE=1）
 */
import { runAgentWorkerLoop } from './agent-worker/runner'

runAgentWorkerLoop(process.stdin, process.stdout)

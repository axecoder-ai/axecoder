/**
 * Workshop Worker 子进程入口（由主进程 fork，ELECTRON_RUN_AS_NODE=1）
 */
import { runWorkshopWorkerLoop } from './workshop-worker/runner'

runWorkshopWorkerLoop(process.stdin, process.stdout)

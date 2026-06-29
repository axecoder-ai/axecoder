/**
 * Indexer Worker 子进程入口（由主进程 fork，ELECTRON_RUN_AS_NODE=1）
 */
import { runIndexerWorkerLoop } from './indexer-worker/runner'

runIndexerWorkerLoop(process.stdin, process.stdout)

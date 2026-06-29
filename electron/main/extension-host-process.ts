/**
 * Extension Host 子进程入口（由主进程 fork，ELECTRON_RUN_AS_NODE=1）
 */
import { runExtensionHostLspLoop } from './extension-host/lsp-runner'

runExtensionHostLspLoop(process.stdin, process.stdout)

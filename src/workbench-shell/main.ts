import '../../src/style.css'
import '@vscode/codicons/dist/codicon.css'
import { createApp } from 'vue'
import ShellApp from './App.vue'
import { installAxecoderShim } from './axecoder-shim'
import { installViewCallHandler } from './view-api'

installAxecoderShim()
installViewCallHandler()
createApp(ShellApp).mount('#app')

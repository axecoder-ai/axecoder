import { createApp } from 'vue'
import App from './App.vue'
import { installAppI18n } from './i18n'
import '@fontsource/jetbrains-mono/400.css'
import '@vscode/codicons/dist/codicon.css'
import './style.css'

document.documentElement.setAttribute('data-theme', 'vscode')

const app = createApp(App).use(installAppI18n)
app.mount('#app')
postMessage({ payload: 'removeLoading' })

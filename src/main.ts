import { createApp } from 'vue'
import App from './App.vue'
import { installAppI18n } from './i18n'
import '@fontsource/jetbrains-mono/400.css'
import './style.css'

document.documentElement.setAttribute('data-theme', 'vscode')

createApp(App).use(installAppI18n).mount('#app')

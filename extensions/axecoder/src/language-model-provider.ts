import * as vscode from 'vscode'
import { listModels } from '@axecoder/core/models-store'

/** 让 VS Code Chat 模型选择器里的 AxeCoder 齿轮 → openModelsSettings */
export const registerAxecoderLanguageModelProvider = (
  context: vscode.ExtensionContext,
): void => {
  const provider: vscode.LanguageModelChatProvider = {
    onDidChangeLanguageModelChatInformation: undefined,
    provideLanguageModelChatInformation: async () => {
      const data = await listModels()
      return data.models
        .filter((m) => m.enabled)
        .map((m) => ({
          id: m.id,
          name: m.name || m.id,
          family: m.provider || 'axecoder',
          version: '1',
          maxInputTokens: m.contextWindow ?? 128000,
          maxOutputTokens: m.maxOutputTokens ?? 8192,
          capabilities: {},
        }))
    },
    provideLanguageModelChatResponse: () => {
      throw new Error('Use AxeCoder Chat sidebar for agent conversations.')
    },
  }
  context.subscriptions.push(
    vscode.lm.registerLanguageModelChatProvider('axecoder', provider),
  )
}

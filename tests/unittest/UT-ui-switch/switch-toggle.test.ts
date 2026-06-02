import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('SwitchToggle', () => {
  const root = resolve(import.meta.dirname, '../../..')
  const switchVue = readFileSync(
    resolve(root, 'src/components/workbench/SwitchToggle.vue'),
    'utf-8',
  )

  it('点击先更新 lit 再 emit，样式为 scoped ax-switch', () => {
    expect(switchVue).toContain('const lit = ref(false)')
    expect(switchVue).toContain('lit.value = next')
    expect(switchVue).toContain('ax-switch--on')
    expect(switchVue).toContain('var(--wc-text-muted)')
    expect(switchVue).toContain('#3fa66b')
    expect(switchVue).toContain("@click.stop=\"toggle\"")
  })

  it('ModelsTab 用 model-value 与 update:model-value', () => {
    const modelsTab = readFileSync(
      resolve(root, 'src/components/workbench/ModelsTab.vue'),
      'utf-8',
    )
    expect(modelsTab).toContain(':model-value="m.enabled"')
    expect(modelsTab).toContain('@update:model-value')
    expect(modelsTab).toContain('models.value = models.value.map')
  })
})

import type { SlashCommandDef, SlashContext } from '../types'

const initCmd: SlashCommandDef = {
  name: 'init',
  description: '扫描项目背景资料与技术参数，生成 .writcraft/background.json',
  async run(ctx: SlashContext) {
    if (!ctx.projectRoot?.trim()) {
      return { ok: false, message: '请先打开项目文件夹。' }
    }

    const modelId = ctx.getModelsFile().activeModelId
    if (!modelId?.trim()) {
      return { ok: false, message: '请先在设置中选择并启用模型，再执行 /init。' }
    }

    const result = await ctx.initBackground(modelId)
    if (!result.ok) {
      return { ok: false, message: result.error }
    }

    const lines: string[] = [
      '背景资料初始化完成（扫描参数 → 识别项目信息 → 归类技术方案 → 对照方案检测参数响应）。',
      '',
    ]
    lines.push(`已写入：${result.manifestPath}`)
    if (result.summaryPath) {
      lines.push(`参数汇总：${result.summaryPath}`)
    }
    const pi = result.projectInfo
    const piLabels: Record<string, string> = {
      projectName: '项目名',
      projectCode: '项目编码',
      purchaser: '招商单位',
      projectAmount: '项目金额',
      servicePeriod: '服务周期',
      bidDeadline: '投标截止',
      location: '地点',
      qualification: '资质要求',
      paymentTerms: '付款方式',
      warranty: '质保售后',
      extra: '其他',
    }
    const piLines = pi
      ? Object.entries(piLabels).filter(([k]) => pi[k as keyof typeof pi]?.trim())
      : []
    if (piLines.length) {
      lines.push('')
      lines.push('项目信息：')
      for (const [k, label] of piLines) {
        lines.push(`- ${label}：${pi![k as keyof typeof pi]}`)
      }
    }
    if (result.parameters?.length) {
      const responded = result.parameters.filter((p) => p.status === 'responded').length
      const pending = result.parameters.length - responded
      lines.push('')
      const techN = result.parameters.filter((p) => (p.kind ?? 'technical') === 'technical').length
      const bizN = result.parameters.length - techN
      lines.push(
        `共 ${result.parameters.length} 条参数（技术 ${techN}，商务 ${bizN}；已响应 ${responded}，未响应 ${pending}）：`,
      )
      for (const p of result.parameters) {
        const tag = p.status === 'responded' ? '已响应' : '未响应'
        const kindTag = (p.kind ?? 'technical') === 'business' ? '商务' : '技术'
        lines.push(`- ${p.label} ${p.title}（${kindTag}，${tag}）`)
      }
    }
    lines.push('')
    if (result.counts.scanned != null) {
      lines.push(`已查看项目文件：${result.counts.scanned} 个`)
    }
    lines.push('')
    lines.push('各类参考文件数：')
    const labels: Record<string, string> = {
      tender: '招标文件',
      negotiation: '磋商文件',
      proposal: '技术方案',
      background: '背景资料',
    }
    for (const [id, n] of Object.entries(result.counts)) {
      if (
        id === 'parameters' ||
        id === 'responded' ||
        id === 'pending' ||
        id === 'params' ||
        id === 'scanned'
      ) {
        continue
      }
      lines.push(`- ${labels[id] ?? id}：${n}`)
    }
    lines.push('')
    lines.push(
      '请在侧栏「背景资料」中刷新查看；可按需编辑 background.json 中的 projectInfo、parameters。',
    )

    return { ok: true, message: lines.join('\n') }
  },
}

export default initCmd

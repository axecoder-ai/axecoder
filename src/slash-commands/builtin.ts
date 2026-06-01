import type { SlashCommandDef } from './types'
import { allCommands as allRegistered } from './registry-core'

export const registerBuiltinSlashCommands = (): SlashCommandDef[] => [
  {
    name: 'help',
    aliases: ['h'],
    description: '列出已注册斜杠命令',
    run: async () => {
      const cmds = allRegistered()
      const lines = cmds.map((c) => {
        const alias = c.aliases?.length ? ` (${c.aliases.map((a) => `/${a}`).join(', ')})` : ''
        return `/${c.name}${alias} — ${c.description}`
      })
      return { ok: true, message: `可用命令：\n\n${lines.join('\n')}` }
    },
  },
  {
    name: 'clear',
    aliases: ['reset'],
    description: '清空当前会话消息',
    run: async (ctx) => {
      const s = ctx.getSession()
      if (!s) return { ok: false, message: '无活动会话' }
      s.messages = []
      s.title = 'New Agent'
      s.updatedAt = Date.now()
      ctx.setSession(s)
      await ctx.persist()
      return { ok: true, message: '已清空当前会话。', silent: true }
    },
  },
  {
    name: 'new',
    description: '新建对话',
    run: async (ctx) => {
      await ctx.newChat()
      return { ok: true, message: '已新建对话。', silent: true }
    },
  },
  {
    name: 'model',
    description: '打开模型设置或切换 activeModelId',
    run: async (ctx, args) => {
      const id = args.trim()
      if (!id) {
        ctx.openModelsSettings()
        return { ok: true, message: '已打开模型设置。' }
      }
      const res = await ctx.setActiveModel(id)
      if (!res.ok) {
        const ids = ctx
          .getModelsFile()
          .models.filter((m) => m.enabled)
          .map((m) => m.id)
          .join(', ')
        return { ok: false, message: `未知或未启用的模型 id：${id}。可用：${ids || '(无)'}` }
      }
      if (res.data) ctx.setModelsFile(res.data)
      return { ok: true, message: `已切换模型：${id}` }
    },
  },
  {
    name: 'compact',
    description: '压缩会话上下文（丢弃较早消息）',
    run: async (ctx) => {
      const s = ctx.getSession()
      if (!s) return { ok: false, message: '无活动会话' }
      const apiMessages = s.messages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.apiContent ?? m.text,
      }))
      const res = await window.axecoder.chatCompact(apiMessages)
      if (!res.ok) return { ok: false, message: res.error ?? '压缩失败' }
      const next = res.messages ?? apiMessages
      s.messages = next.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        text: m.content,
      }))
      s.updatedAt = Date.now()
      ctx.setSession(s)
      await ctx.persist()
      return {
        ok: true,
        message: res.summary ? `已压缩：${res.summary}` : '已压缩会话上下文。',
      }
    },
  },
  {
    name: 'hooks',
    description: '查看 Agent hooks 配置说明',
    run: async () => {
      const res = await window.axecoder.agentHooksHelp()
      if (!res.ok) return { ok: false, message: res.error ?? '无法读取 hooks' }
      return { ok: true, message: res.text ?? '(empty)' }
    },
  },
  {
    name: 'mcp',
    description: '列出 MCP 服务器配置（来自 mcp.json）',
    run: async () => {
      const res = await window.axecoder.agentListMcp()
      if (!res.ok) return { ok: false, message: res.error ?? '无法读取 MCP' }
      return { ok: true, message: res.text }
    },
  },
  {
    name: 'plan',
    description: '计划模式说明（EnterPlanMode / ExitPlanMode）',
    run: async () => {
      const res = await window.axecoder.agentPlanModeHelp()
      if (!res.ok) return { ok: false, message: res.error ?? '无法读取' }
      return { ok: true, message: res.text }
    },
  },
  {
    name: 'skills',
    description: '列出 .cursor/skills 下已发现的 Skill',
    run: async (ctx) => {
      const res = await window.axecoder.agentListSkills(ctx.projectRoot)
      if (!res.ok) return { ok: false, message: res.error ?? '无法列出 skills' }
      if (!res.skills.length) {
        return {
          ok: true,
          message: '未发现 Skill。请在 `.cursor/skills/<name>/SKILL.md` 或 `~/.cursor/skills/` 下添加。',
        }
      }
      const lines = res.skills.map(
        (s) => `/${s.name} — ${s.source} (${s.path})`,
      )
      return {
        ok: true,
        message: `已发现 ${res.skills.length} 个 Skill（亦可用 /skill名 直接加载）：\n\n${lines.join('\n')}`,
      }
    },
  },
  {
    name: 'rewind',
    description: '回滚到 Agent checkpoint，或查看 Git 状态',
    run: async (ctx, args) => {
      const agentId = ctx.getAgentSessionId?.()
      const cpId = args.trim()
      if (agentId) {
        const res = await window.axecoder.agentRewind(agentId, cpId || undefined)
        if (res.ok) {
          return {
            ok: true,
            message: `已回滚到「${res.label}」，恢复 ${res.restoredFiles} 个文件快照。`,
          }
        }
        if (cpId) return { ok: false, message: res.error ?? '回滚失败' }
      }
      const list = agentId
        ? await window.axecoder.agentListCheckpoints(agentId)
        : null
      const help = await window.axecoder.agentRewindHelp(ctx.projectRoot)
      if (!help.ok) return { ok: false, message: help.error ?? '无法获取回滚信息' }
      const cpLines =
        list?.ok && list.checkpoints.length
          ? [
              '',
              '可用 checkpoint（`/rewind <id>`）：',
              ...list.checkpoints.map(
                (c) => `- ${c.id} — ${c.label}（${c.fileCount} 文件）`,
              ),
            ].join('\n')
          : agentId
            ? '\n\n（当前 Agent 会话尚无 checkpoint）'
            : '\n\n（先运行一轮 Agent 对话后再 /rewind）'
      return { ok: true, message: help.text + cpLines }
    },
  },
  {
    name: 'resume',
    description: '列出内存中活跃的 Agent 会话（可继续 confirm）',
    run: async () => {
      const res = await window.axecoder.agentListSessions()
      if (!res.ok || !res.sessions.length) {
        return {
          ok: true,
          message:
            '当前无活跃 Agent 会话（仅保存在内存中，应用重启后需重新发送）。',
        }
      }
      const lines = res.sessions.map(
        (s) =>
          `- ${s.id} — 第 ${s.turn} 轮，${s.messageCount} 条消息，项目 ${s.projectRoot}`,
      )
      return { ok: true, message: `活跃 Agent 会话：\n\n${lines.join('\n')}` }
    },
  },
  {
    name: 'export',
    description: '导出当前聊天会话为 JSON',
    run: async (ctx) => {
      const s = ctx.getSession()
      if (!s) return { ok: false, message: '无活动会话' }
      const json = JSON.stringify(s, null, 2)
      try {
        await navigator.clipboard.writeText(json)
        return {
          ok: true,
          message: `已复制会话 JSON 到剪贴板（${s.messages.length} 条消息）。`,
        }
      } catch {
        return {
          ok: true,
          message: `会话 JSON：\n\n\`\`\`json\n${json.slice(0, 4000)}${json.length > 4000 ? '\n…(已截断)' : ''}\n\`\`\``,
        }
      }
    },
  },
  {
    name: 'init',
    description: '在项目根创建 AGENTS.md 模板',
    run: async (ctx) => {
      const res = await window.axecoder.agentInitAgentsMd(ctx.projectRoot)
      if (!res.ok) return { ok: false, message: res.error ?? '失败' }
      return {
        ok: true,
        message: res.created
          ? `已创建 ${res.path}`
          : `已存在 ${res.path}（未覆盖）`,
      }
    },
  },
  {
    name: 'memory',
    description: '查看或写入 ~/.aex-coder/memory.md',
    run: async (_ctx, args) => {
      const text = args.trim()
      if (!text) {
        const res = await window.axecoder.agentReadMemory()
        if (!res.ok) return { ok: false, message: res.error ?? '读取失败' }
        const body = res.text.trim() || '(empty)'
        return { ok: true, message: `Memory (${res.path}):\n\n${body}` }
      }
      if (text.startsWith('set ')) {
        const content = text.slice(4)
        const w = await window.axecoder.agentWriteMemory(content)
        if (!w.ok) return { ok: false, message: w.error ?? '写入失败' }
        return { ok: true, message: `已写入 ${w.path}` }
      }
      return {
        ok: true,
        message:
          '用法：/memory 查看；/memory set <正文> 覆盖写入 ~/.aex-coder/memory.md',
      }
    },
  },
  {
    name: 'style',
    aliases: ['output-style'],
    description: '列出或切换 Agent 输出风格（含自定义 output-styles 目录）',
    run: async (ctx, args) => {
      const id = args.trim()
      const listRes = await window.axecoder.agentListOutputStyles(ctx.projectRoot)
      if (!listRes.ok) return { ok: false, message: listRes.error ?? '无法列出风格' }
      if (!id) {
        const lines = listRes.styles.map((s) => {
          const active = s.id === listRes.activeId ? ' ← 当前' : ''
          return `- ${s.id} (${s.source})${active}: ${s.description}`
        })
        return {
          ok: true,
          message: [
            '输出风格目录：',
            ...listRes.dirs.map((d) => `  ${d}`),
            '',
            lines.join('\n'),
            '',
            '切换：/style <id>（如 /style Explanatory 或自定义 slug）',
          ].join('\n'),
        }
      }
      const setRes = await window.axecoder.agentSetOutputStyle(id)
      if (!setRes.ok) return { ok: false, message: setRes.error ?? '设置失败' }
      return { ok: true, message: `已切换输出风格：${setRes.activeId}` }
    },
  },
]

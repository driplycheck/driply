// Агенты Driply: у каждого своя тема в группе, свой характер и свои инструменты.
// Сообщение в теме → запрос к Claude с историей этой темы → ответ туда же.
// Инструменты выполняются здесь, на сервере: модель сама решает, когда их дёрнуть.

const API_KEY = Deno.env.get('ANTHROPIC_API_KEY') ?? ''
const GH_TOKEN = Deno.env.get('GH_TOKEN') ?? ''
const GH_REPO = Deno.env.get('GH_REPO') ?? 'driplycheck/driply'
const MODEL = Deno.env.get('AGENT_MODEL') ?? 'claude-sonnet-5'

const COMMON = `Ты — часть команды проекта Driply: телеграм мини-апп для шаринга образов с внутренней валютой «дрипы».
Продукт запущен, пользователей около двадцати, стадия — привлечение первых людей, не масштабирование.
Стек: React + Vite на Vercel, Supabase (Postgres + edge-функции на Deno), бот работает вебхуком.
Отвечай по-русски, коротко и по делу, без воды и без списков ради списков. Telegram понимает HTML-теги <b> и <i>, markdown не понимает.
Если чего-то не знаешь — так и скажи, не выдумывай. Если нужен инструмент — вызывай его, а не рассуждай о том, что мог бы.`

export const AGENTS: Record<string, { name: string; topic: string; icon: number; prompt: string; tools: string[] }> = {
  tester: {
    name: 'Тестировщик',
    topic: '🧪 Тестировщик',
    icon: 0x6FB9F0,
    prompt: `${COMMON}

Ты тестировщик. Твоя работа — знать, что в проде работает, а что сломалось.
Проверка гоняет живой прод: открывает приложение в настоящем браузере, жмёт кнопки, отдельно проверяет бэкенд и бота.
Она запускается дважды в день и на каждый пуш, но ты можешь запустить её по просьбе.
Когда просят «проверь» — запускай инструментом и сообщай результат, а не пересказывай прошлый отчёт.
Если проверка упала — объясни, какой именно шаг и что это значит для пользователя.`,
    tools: ['run_tests', 'test_status', 'health'],
  },
}

// --- инструменты ---

const TOOL_SPECS: Record<string, unknown> = {
  run_tests: {
    name: 'run_tests',
    description: 'Запустить полную проверку прода (приложение + бэкенд + бот). Возвращает ссылку на прогон. Результат придёт отдельным отчётом в тему «Отчёты» через пару минут.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  test_status: {
    name: 'test_status',
    description: 'Состояние последних прогонов проверки: когда были и чем кончились.',
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'integer', description: 'сколько прогонов вернуть, по умолчанию 3' } },
      required: [],
    },
  },
  health: {
    name: 'health',
    description: 'Быстрая проверка связей прямо сейчас: жив ли бот, стоит ли вебхук, нет ли у него ошибок, привязаны ли темы.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
}

async function gh(path: string, init: RequestInit = {}) {
  if (!GH_TOKEN) throw new Error('нет GH_TOKEN: запуск проверок из чата не настроен')
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'driply-agents',
      ...(init.headers ?? {}),
    },
  })
  if (res.status === 204) return {}
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`GitHub ${res.status}: ${json?.message ?? 'нет ответа'}`)
  return json
}

async function runTool(name: string, input: Record<string, unknown>, ctx: { selfUrl: string; ciSecret: string }) {
  if (name === 'run_tests') {
    await gh(`/repos/${GH_REPO}/actions/workflows/tester.yml/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'main' }),
    })
    return 'Проверка запущена. Займёт около трёх минут, отчёт придёт в тему «Отчёты».'
  }

  if (name === 'test_status') {
    const limit = Math.min(Number(input.limit) || 3, 10)
    const json = await gh(`/repos/${GH_REPO}/actions/workflows/tester.yml/runs?per_page=${limit}`)
    const runs = (json.workflow_runs ?? []).map((r: Record<string, string>) =>
      `${r.created_at?.slice(0, 16).replace('T', ' ')} — ${r.status === 'completed' ? r.conclusion : r.status}`)
    return runs.length ? runs.join('\n') : 'прогонов ещё не было'
  }

  if (name === 'health') {
    const res = await fetch(`${ctx.selfUrl}?health=${encodeURIComponent(ctx.ciSecret)}`)
    const json = await res.json().catch(() => ({}))
    return JSON.stringify(json).slice(0, 1500)
  }

  return `неизвестный инструмент: ${name}`
}

// --- разговор с моделью ---

type Msg = { role: 'user' | 'assistant'; content: unknown }

async function callClaude(system: string, messages: Msg[], tools: unknown[]) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, system, messages, ...(tools.length ? { tools } : {}) }),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${json?.error?.message ?? 'нет ответа'}`)
  return json
}

export async function askAgent(
  kind: string,
  text: string,
  history: { role: string; body: string }[],
  ctx: { selfUrl: string; ciSecret: string },
) {
  const agent = AGENTS[kind]
  if (!agent) return 'Не знаю такого агента.'
  if (!API_KEY) return 'Ключ Anthropic не задан — отвечать нечем. Поставь секрет ANTHROPIC_API_KEY и повтори.'

  const tools = agent.tools.map((t) => TOOL_SPECS[t]).filter(Boolean)
  const messages: Msg[] = [
    ...history.map((h) => ({ role: h.role as 'user' | 'assistant', content: h.body })),
    { role: 'user', content: text },
  ]

  // цикл инструментов: модель может сходить за данными несколько раз подряд
  for (let step = 0; step < 4; step++) {
    const reply = await callClaude(agent.prompt, messages, tools)
    const blocks = reply.content ?? []

    if (reply.stop_reason !== 'tool_use') {
      return blocks.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n').trim()
        || 'Пусто. Попробуй переспросить.'
    }

    messages.push({ role: 'assistant', content: blocks })
    const results = []
    for (const block of blocks) {
      if (block.type !== 'tool_use') continue
      let out: string
      try {
        out = await runTool(block.name, block.input ?? {}, ctx)
      } catch (e) {
        out = `инструмент упал: ${e instanceof Error ? e.message : String(e)}`
      }
      results.push({ type: 'tool_result', tool_use_id: block.id, content: out })
    }
    messages.push({ role: 'user', content: results })
  }

  return 'Слишком много шагов подряд, остановился. Переспроси конкретнее.'
}

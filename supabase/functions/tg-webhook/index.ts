// Бот целиком на Edge Function: Telegram шлёт апдейты вебхуком, отдельный процесс не нужен.
// Секреты: BOT_TOKEN, WEBAPP_URL, TG_WEBHOOK_SECRET (+ SUPABASE_* для аналитики, они уже есть).
import { createClient } from 'npm:@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? ''
const WEBAPP_URL = Deno.env.get('WEBAPP_URL') ?? ''
const WEBHOOK_SECRET = Deno.env.get('TG_WEBHOOK_SECRET') ?? ''
const WEBAPP_HTTPS = WEBAPP_URL.startsWith('https://')

const COPY = {
  ru: {
    welcome: '<b>Driply</b> — открывай мини-апп, там всё 👇',
    welcome_ref: '<b>Driply</b> — тебя пригласил друг. Открой мини-апп и выложи первый образ: бонус придёт обоим 👇',
    open: 'Открыть Driply',
    help: '<b>Driply</b> — лента образов.\n\n/app — открыть мини-апп\n/help — эта справка\n\nВопросы и жалобы — пиши сюда же, читаю.',
    cmd_start: 'Открыть Driply',
    cmd_app: 'Открыть мини-апп',
    cmd_help: 'Что это и как работает',
    menu: 'Driply',
  },
  en: {
    welcome: '<b>Driply</b> — open the mini app, it’s all there 👇',
    welcome_ref: '<b>Driply</b> — a friend invited you. Open the mini app and post your first look: you both get a bonus 👇',
    open: 'Open Driply',
    help: '<b>Driply</b> is a feed of outfits.\n\n/app — open the mini app\n/help — this help\n\nQuestions or reports — just write here, I read them.',
    cmd_start: 'Open Driply',
    cmd_app: 'Open the mini app',
    cmd_help: 'What this is and how it works',
    menu: 'Driply',
  },
}

async function tg(method: string, body: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!json.ok) console.error('tg', method, res.status, json.description ?? '')
  return json
}

function pickLang(code?: string) {
  return (code ?? '').toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

// код приглашения из /start ref_КОД: оставляем только безопасные символы
function parseRef(payload?: string) {
  if (!payload) return null
  const raw = payload.startsWith('ref_') ? payload.slice(4) : payload
  const code = raw.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
  return code || null
}

function openButton(lang: 'ru' | 'en', ref: string | null) {
  const sep = WEBAPP_URL.includes('?') ? '&' : '?'
  const url = ref ? `${WEBAPP_URL}${sep}ref=${ref}` : WEBAPP_URL
  // web_app-кнопка работает только с https, иначе Telegram отклонит сообщение целиком
  const button = WEBAPP_HTTPS
    ? { text: COPY[lang].open, web_app: { url } }
    : { text: COPY[lang].open, url }
  return { inline_keyboard: [[button]] }
}

async function track(tid: number, kind: string, meta: Record<string, unknown>) {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { error } = await supabase.rpc('track_event', { p_tid: tid, p_kind: kind, p_meta: meta })
    if (error) console.error('track_event', kind, error.message)
  } catch (e) {
    console.error('track_event', kind, String(e))
  }
}

// Команды и синяя кнопка меню: GET /tg-webhook?setup=<TG_WEBHOOK_SECRET>
async function setup() {
  for (const [lang, code] of [['en', null], ['ru', 'ru']] as const) {
    await tg('setMyCommands', {
      commands: [
        { command: 'start', description: COPY[lang].cmd_start },
        { command: 'app', description: COPY[lang].cmd_app },
        { command: 'help', description: COPY[lang].cmd_help },
      ],
      scope: { type: 'default' },
      ...(code ? { language_code: code } : {}),
    })
  }
  if (WEBAPP_HTTPS) {
    await tg('setChatMenuButton', {
      menu_button: { type: 'web_app', text: COPY.ru.menu, web_app: { url: WEBAPP_URL } },
    })
  }
  return { ok: true, webapp: WEBAPP_URL, https: WEBAPP_HTTPS }
}

Deno.serve(async (req) => {
  if (!BOT_TOKEN) return new Response('NO_BOT_TOKEN', { status: 500 })

  const url = new URL(req.url)
  const setupKey = url.searchParams.get('setup')
  if (setupKey) {
    if (!WEBHOOK_SECRET || setupKey !== WEBHOOK_SECRET) return new Response('forbidden', { status: 403 })
    return Response.json(await setup())
  }

  // Telegram присылает секрет заголовком — чужие запросы отсекаем
  if (WEBHOOK_SECRET && req.headers.get('x-telegram-bot-api-secret-token') !== WEBHOOK_SECRET) {
    return new Response('forbidden', { status: 403 })
  }

  try {
    const update = await req.json()
    const message = update.message
    const text: string = message?.text ?? ''
    if (message?.chat?.id && text.startsWith('/')) {
      const [cmd, payload] = text.split(/\s+/, 2)
      const command = cmd.split('@')[0]
      const lang = pickLang(message.from?.language_code) as 'ru' | 'en'
      const chatId = message.chat.id

      if (command === '/start') {
        const ref = parseRef(payload)
        await tg('sendMessage', {
          chat_id: chatId,
          text: ref ? COPY[lang].welcome_ref : COPY[lang].welcome,
          parse_mode: 'HTML',
          reply_markup: openButton(lang, ref),
        })
        if (message.from?.id) await track(message.from.id, 'bot_start', { ref: Boolean(ref), lang })
      } else if (command === '/app') {
        await tg('sendMessage', { chat_id: chatId, text: COPY[lang].welcome, parse_mode: 'HTML', reply_markup: openButton(lang, null) })
      } else if (command === '/help') {
        await tg('sendMessage', { chat_id: chatId, text: COPY[lang].help, parse_mode: 'HTML', reply_markup: openButton(lang, null) })
      }
    }
  } catch (e) {
    console.error('webhook', String(e)) // Telegram не должен ретраить из-за нашей ошибки
  }
  return new Response('ok')
})

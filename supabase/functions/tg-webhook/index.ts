// Бот целиком на Edge Function: Telegram шлёт апдейты вебхуком, отдельный процесс не нужен.
// Секреты: BOT_TOKEN, WEBAPP_URL, TG_WEBHOOK_SECRET (+ SUPABASE_* для аналитики, они уже есть).
import { createClient } from 'npm:@supabase/supabase-js@2'

function db() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? ''
const WEBAPP_URL = Deno.env.get('WEBAPP_URL') ?? ''
const WEBHOOK_SECRET = Deno.env.get('TG_WEBHOOK_SECRET') ?? ''

// Темы в группе поддержки: имя топика ↔ колонка в support_routing
const SUPPORT_TOPICS = [
  { kind: 'bug', col: 'thread_bug', name: '🛠 Не работает', icon: 0x6FB9F0 },
  { kind: 'idea', col: 'thread_idea', name: '💡 Идеи', icon: 0xFFD67E },
  { kind: 'partner', col: 'thread_partner', name: '🤝 Сотрудничество', icon: 0xCB86DB },
]
const SUPPORT_LABEL: Record<string, string> = {
  bug: '🛠 <b>Не работает</b>', idea: '💡 <b>Идея</b>', partner: '🤝 <b>Сотрудничество</b>',
}
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

    // Обычное сообщение (не команда) — это поддержка
    if (message?.chat?.id && text && !text.startsWith('/')) {
      const supabase = db()
      const fromTid = message.from?.id
      const { data: modTid } = await supabase.rpc('support_moderator_tid')
      const { data: route } = await supabase.from('support_routing').select('*').maybeSingle()
      const replyTo = message.reply_to_message?.message_id
      const inSupportChat = route?.chat_id && message.chat.id === Number(route.chat_id)

      // ответ реплаем на пересланное обращение → отправляем человеку
      // (в группе поддержки или в личке основателя — бот в группе видит только реплаи на свои сообщения)
      if (replyTo && (inSupportChat || (fromTid && modTid && fromTid === modTid))) {
        const { data: src } = await supabase.from('support_messages')
          .select('tid, user_id').eq('tg_message_id', replyTo).maybeSingle()
        const back = { chat_id: message.chat.id, reply_to_message_id: message.message_id }
        if (src?.tid) {
          await tg('sendMessage', { chat_id: src.tid, text: `<b>Поддержка Driply</b>\n\n${text}`, parse_mode: 'HTML' })
          await supabase.from('support_messages').insert({
            user_id: src.user_id, tid: src.tid, direction: 'out', body: text.slice(0, 1000),
          })
          await tg('sendMessage', { ...back, text: '✅ Отправлено' })
        } else {
          await tg('sendMessage', { ...back, text: 'Не нашёл, кому это адресовано. Отвечай реплаем на само обращение.' })
        }
        return new Response('ok')
      }

      // свои заметки в группе поддержки пересылать некуда
      if (inSupportChat || message.chat.type !== 'private') return new Response('ok')

      // обычный человек написал боту — принимаем как обращение
      if (fromTid) {
        const { data: user } = await supabase.from('users').select('id, display_name')
          .eq('telegram_id', fromTid).maybeSingle()
        const { data: row } = await supabase.from('support_messages')
          .insert({ user_id: user?.id ?? null, tid: fromTid, direction: 'in', body: text.slice(0, 1000), kind: 'bug' })
          .select('id').single()

        const chatId = route?.chat_id ?? modTid
        if (chatId) {
          const who = user?.display_name || message.from?.username || message.from?.first_name || 'user'
          const head = `${SUPPORT_LABEL.bug} · ${who}${message.from?.username ? ' @' + message.from.username : ''} · id ${fromTid}`
          const sent = await tg('sendMessage', {
            chat_id: chatId, parse_mode: 'HTML',
            ...(route?.thread_bug ? { message_thread_id: route.thread_bug } : {}),
            text: `${head}\n\n${text}\n\n<i>Ответь реплаем на это сообщение</i>`,
          })
          if (sent?.result?.message_id && row?.id) {
            await supabase.from('support_messages')
              .update({ tg_message_id: sent.result.message_id }).eq('id', row.id)
          }
        }
        await tg('sendMessage', { chat_id: message.chat.id, text: 'Принял, отвечу здесь же 👌' })
      }
      return new Response('ok')
    }

    if (message?.chat?.id && text.startsWith('/')) {
      const [cmd, payload] = text.split(/\s+/, 2)
      const command = cmd.split('@')[0]
      const lang = pickLang(message.from?.language_code) as 'ru' | 'en'
      const chatId = message.chat.id

      // Настройка группы поддержки: основатель пишет /setup_support в супергруппе с темами.
      // Бот сам создаёт три топика и запоминает их — руками id копировать не нужно.
      if (command === '/setup_support') {
        const supabase = db()
        const { data: modTid } = await supabase.rpc('support_moderator_tid')
        if (!modTid || message.from?.id !== modTid) return new Response('ok')

        if (message.chat.type !== 'supergroup' || !message.chat.is_forum) {
          await tg('sendMessage', { chat_id: chatId, text: 'Нужна супергруппа с включёнными темами: настройки группы → Темы.' })
          return new Response('ok')
        }

        const { data: route } = await supabase.from('support_routing').select('*').maybeSingle()
        if (route?.chat_id === chatId && payload !== 'force') {
          await tg('sendMessage', { chat_id: chatId, text: 'Группа уже настроена. Пересоздать темы: /setup_support force' })
          return new Response('ok')
        }

        const threads: Record<string, number> = {}
        for (const topic of SUPPORT_TOPICS) {
          const res = await tg('createForumTopic', { chat_id: chatId, name: topic.name, icon_color: topic.icon })
          if (!res?.ok) {
            await tg('sendMessage', { chat_id: chatId, text: `Не смог создать тему «${topic.name}»: ${res?.description ?? 'нет прав'}. Дай боту права администратора с управлением темами.` })
            return new Response('ok')
          }
          threads[topic.col] = res.result.message_thread_id
        }

        await supabase.from('support_routing').upsert({ id: 1, chat_id: chatId, ...threads, updated_at: new Date().toISOString() })
        await tg('sendMessage', { chat_id: chatId, text: '✅ Готово. Обращения будут падать в темы выше, отвечай реплаем на сообщение.' })
        return new Response('ok')
      }

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

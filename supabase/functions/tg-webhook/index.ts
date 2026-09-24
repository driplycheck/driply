// Бот целиком на Edge Function: Telegram шлёт апдейты вебхуком, отдельный процесс не нужен.
// Секреты: BOT_TOKEN, WEBAPP_URL, TG_WEBHOOK_SECRET (+ SUPABASE_* для аналитики, они уже есть).
import { createClient } from 'npm:@supabase/supabase-js@2'

function db() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? ''
const WEBAPP_URL = Deno.env.get('WEBAPP_URL') ?? ''
const WEBHOOK_SECRET = Deno.env.get('TG_WEBHOOK_SECRET') ?? ''
// Отдельный ключ для автоматических проверок: у CI нет причин знать боевой секрет вебхука
const CI_SECRET = Deno.env.get('CI_SECRET') ?? ''
const serviceKey = (key: string | null) => Boolean(key) && (key === CI_SECRET || key === WEBHOOK_SECRET)

// Темы в группе поддержки: имя топика ↔ колонка в support_routing
const SUPPORT_TOPICS = [
  { kind: 'bug', col: 'thread_bug', name: '🛠 Не работает', icon: 0x6FB9F0 },
  { kind: 'idea', col: 'thread_idea', name: '💡 Идеи', icon: 0xFFD67E },
  { kind: 'partner', col: 'thread_partner', name: '🤝 Сотрудничество', icon: 0xCB86DB },
  { kind: 'reports', col: 'thread_reports', name: '🤖 Отчёты проверок', icon: 0x8EEE98 },
]
const SUPPORT_LABEL: Record<string, string> = {
  bug: '🛠 <b>Не работает</b>', idea: '💡 <b>Идея</b>', partner: '🤝 <b>Сотрудничество</b>',
}
const WEBAPP_HTTPS = WEBAPP_URL.startsWith('https://')

const COPY = {
  ru: {
    welcome: '<b>driply</b> — лента образов 💧\n\nвыкладываешь лук → тебе кидают дрипы → чем больше дрипов, тем выше ты в рейтинге\n\nдрипы нельзя купить, только заработать. за первый образ — <b>300 💧</b>',
    welcome_ref: '<b>driply</b> — лента образов 💧\n\nтебя позвал друг: выложи первый образ, и бонус упадёт обоим — тебе <b>+200 💧</b>, ему <b>+500 💧</b>\n\nдрипы нельзя купить, только заработать',
    slots: (n: number) => `\n\nстатус <b>first drip</b> получат только первые 50 авторов. ${left(n)}`,
    open: 'Открыть Driply',
    help: '<b>driply</b> — лента образов.\n\n/app — открыть мини-апп\n/help — эта справка\n\nчто-то сломалось, есть идея или предложение — пиши сюда же, читаю лично.',
    cmd_start: 'Открыть Driply',
    cmd_app: 'Открыть мини-апп',
    cmd_help: 'Что это и как работает',
    menu: 'Driply',
  },
  en: {
    welcome: '<b>driply</b> — a feed of outfits 💧\n\npost a look → people drop drips on it → the more drips, the higher you rank\n\ndrips can’t be bought, only earned. your first look pays <b>300 💧</b>',
    welcome_ref: '<b>driply</b> — a feed of outfits 💧\n\na friend invited you: post your first look and you both get paid — <b>+200 💧</b> to you, <b>+500 💧</b> to them\n\ndrips can’t be bought, only earned',
    slots: (n: number) => `\n\nonly the first 50 authors get the <b>first drip</b> status. ${n} ${n === 1 ? 'spot' : 'spots'} left`,
    open: 'Open Driply',
    help: '<b>driply</b> is a feed of outfits.\n\n/app — open the mini app\n/help — this help\n\nbroken something, got an idea or an offer — write here, I read every message.',
    cmd_start: 'Open Driply',
    cmd_app: 'Open the mini app',
    cmd_help: 'What this is and how it works',
    menu: 'Driply',
  },
}

// «осталось 43 места» / «41 место» / «2 места» — иначе текст выглядит машинным
function left(n: number) {
  const tail = n % 100 >= 11 && n % 100 <= 14 ? 'мест'
    : n % 10 === 1 ? 'место'
    : n % 10 >= 2 && n % 10 <= 4 ? 'места' : 'мест'
  return `осталось ${n} ${tail}`
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

// Строка про свободные места first drip. Не получилось посчитать — просто её не будет.
async function slotsLine(lang: 'ru' | 'en') {
  try {
    const { data, error } = await db().rpc('first_drip_left')
    if (error || typeof data !== 'number' || data <= 0) return ''
    return COPY[lang].slots(data)
  } catch {
    return ''
  }
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
  // Отчёт автоматической проверки в тему «Отчёты»: POST { text } с тем же секретом.
  if (url.searchParams.get('report')) {
    if (!serviceKey(url.searchParams.get('report'))) return new Response('forbidden', { status: 403 })
    const body = await req.json().catch(() => ({}))
    const text = String(body?.text ?? '').slice(0, 3500)
    if (!text) return Response.json({ ok: false, error: 'EMPTY' }, { status: 400 })
    const { data: routes } = await db().rpc('support_routing_get')
    const route = Array.isArray(routes) ? routes[0] : routes
    if (!route?.chat_id) return Response.json({ ok: false, error: 'NO_CHAT' }, { status: 400 })
    const sent = await tg('sendMessage', {
      chat_id: route.chat_id, text, parse_mode: 'HTML',
      ...(route.thread_reports ? { message_thread_id: route.thread_reports } : {}),
    })
    return Response.json({ ok: Boolean(sent?.ok), description: sent?.description ?? null })
  }

  // Самопроверка: CI спрашивает, живы ли база, роутинг и сам бот.
  if (url.searchParams.get('health')) {
    if (!serviceKey(url.searchParams.get('health'))) return new Response('forbidden', { status: 403 })
    const checks: Record<string, unknown> = {}
    const supabase = db()
    const me = await tg('getMe', {})
    checks.bot = me?.ok ? me.result.username : `FAIL: ${me?.description ?? 'нет ответа'}`
    const hook = await tg('getWebhookInfo', {})
    checks.webhook_url = hook?.result?.url ?? null
    checks.webhook_pending = hook?.result?.pending_update_count ?? null
    checks.webhook_last_error = hook?.result?.last_error_message ?? null
    const { data: mod, error: modErr } = await supabase.rpc('support_moderator_tid')
    checks.moderator = modErr ? `FAIL: ${modErr.message}` : mod
    const { data: routes, error: routeErr } = await supabase.rpc('support_routing_get')
    const route = Array.isArray(routes) ? routes[0] : routes
    checks.support_chat = routeErr ? `FAIL: ${routeErr.message}` : (route?.chat_id ?? null)
    checks.topics = route ? SUPPORT_TOPICS.filter((t) => route[t.col]).map((t) => t.kind) : []
    const { data: slots, error: slotErr } = await supabase.rpc('first_drip_left')
    checks.first_drip_left = slotErr ? `FAIL: ${slotErr.message}` : slots
    const bad = Object.values(checks).some((v) => typeof v === 'string' && v.startsWith('FAIL'))
    return Response.json({ ok: !bad && !checks.webhook_last_error, checks })
  }

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

    // Обычное сообщение (не команда) — это поддержка.
    // Только RPC: прямых прав на таблицы у service_role в проекте нет.
    if (message?.chat?.id && text && !text.startsWith('/')) {
      const supabase = db()
      const fromTid = message.from?.id
      const { data: modTid } = await supabase.rpc('support_moderator_tid')
      const { data: routes } = await supabase.rpc('support_routing_get')
      const route = Array.isArray(routes) ? routes[0] : routes
      const replyTo = message.reply_to_message?.message_id
      const inSupportChat = route?.chat_id && message.chat.id === Number(route.chat_id)

      // ответ реплаем на пересланное обращение → отправляем человеку
      // (в группе поддержки или в личке основателя — в группе бот видит только реплаи на свои сообщения)
      if (replyTo && (inSupportChat || (fromTid && modTid && fromTid === modTid))) {
        const { data: found } = await supabase.rpc('support_by_message', { p_msg_id: replyTo })
        let src = Array.isArray(found) ? found[0] : found
        // запасной путь: адресат всегда написан в шапке пересланного сообщения («· id 12345»),
        // поэтому ответ дойдёт даже если запись в базу не удалась
        if (!src?.tid) {
          const fallback = String(message.reply_to_message?.text ?? '').match(/·\s*id\s+(\d+)/)
          if (fallback) src = { tid: Number(fallback[1]) }
        }
        const back = { chat_id: message.chat.id, reply_to_message_id: message.message_id }
        if (src?.tid) {
          const sent = await tg('sendMessage', { chat_id: src.tid, text: `<b>Поддержка Driply</b>\n\n${text}`, parse_mode: 'HTML' })
          if (sent?.ok) {
            const { error: logErr } = await supabase.rpc('support_add_reply', { p_tid: src.tid, p_body: text })
            if (logErr) console.error('support_add_reply', logErr.message)
            await tg('sendMessage', { ...back, text: '✅ Отправлено' })
          } else {
            await tg('sendMessage', { ...back, text: `Не доставлено: ${sent?.description ?? 'Telegram отказал'}` })
          }
        } else {
          await tg('sendMessage', { ...back, text: 'Не нашёл, кому это адресовано. Отвечай реплаем на само обращение.' })
        }
        return new Response('ok')
      }

      // свои заметки в группе поддержки пересылать некуда
      if (inSupportChat || message.chat.type !== 'private') return new Response('ok')

      // обычный человек написал боту — принимаем как обращение
      if (fromTid) {
        const { data: added, error } = await supabase.rpc('support_add', { p_tid: fromTid, p_kind: 'bug', p_body: text })
        if (error) console.error('support_add', error.message)
        const row = Array.isArray(added) ? added[0] : added

        const chatId = route?.chat_id ?? modTid
        if (chatId) {
          const who = row?.display_name || message.from?.username || message.from?.first_name || 'user'
          const head = `${SUPPORT_LABEL.bug} · ${who}${message.from?.username ? ' @' + message.from.username : ''} · id ${fromTid}`
          const sent = await tg('sendMessage', {
            chat_id: chatId, parse_mode: 'HTML',
            ...(route?.thread_bug ? { message_thread_id: route.thread_bug } : {}),
            text: `${head}\n\n${text}\n\n<i>Ответь реплаем на это сообщение</i>`,
          })
          if (sent?.result?.message_id && row?.id) {
            const { error: markErr } = await supabase.rpc('support_mark_sent', { p_id: row.id, p_msg_id: sent.result.message_id })
            if (markErr) console.error('support_mark_sent', markErr.message)
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

        const { data: routes } = await supabase.rpc('support_routing_get')
        const route = Array.isArray(routes) ? routes[0] : routes
        const arg = (payload ?? '').trim().toLowerCase()
        const picked = SUPPORT_TOPICS.find((t) => t.kind === arg)

        // темы уже созданы руками: /setup_support <тип> внутри нужной темы привязывает её
        if (picked) {
          const threadId = message.message_thread_id
          if (!threadId) {
            await tg('sendMessage', { chat_id: chatId, text: 'Отправь эту команду внутри самой темы, а не в общем чате.' })
            return new Response('ok')
          }
          const { error: saveErr } = await supabase.rpc('support_routing_set', {
            p_chat_id: chatId, p_kind: picked.kind, p_thread: threadId,
          })
          if (saveErr) {
            await tg('sendMessage', { chat_id: chatId, message_thread_id: threadId, text: `Не сохранил: ${saveErr.message}` })
            return new Response('ok')
          }
          const { data: after } = await supabase.rpc('support_routing_get')
          const now = Array.isArray(after) ? after[0] : after
          const left = SUPPORT_TOPICS.filter((t) => !now?.[t.col]).map((t) => '/setup_support ' + t.kind)
          await tg('sendMessage', {
            chat_id: chatId, message_thread_id: threadId,
            text: left.length
              ? `✅ Тема «${picked.name}» привязана.\n\nОсталось: ${left.join(', ')} — каждую команду внутри своей темы.`
              : `✅ Тема «${picked.name}» привязана. Все три темы на месте, поддержка настроена.`,
          })
          return new Response('ok')
        }

        if (arg && arg !== 'force') {
          await tg('sendMessage', { chat_id: chatId, text: 'Типы: bug, idea, partner. Пиши /setup_support <тип> внутри нужной темы, либо /setup_support без аргумента — бот создаст темы сам.' })
          return new Response('ok')
        }

        if (route?.chat_id === chatId && arg === 'force') {
          await tg('sendMessage', {
            chat_id: chatId,
            text: 'Пересоздание отключено: оно плодит дубли тем. Чтобы перепривязать тему — зайди в неё и отправь /setup_support <тип>. Список: /topics',
          })
          return new Response('ok')
        }

        // создаём только недостающие: иначе повторный запуск плодит дубли тем
        const missing = SUPPORT_TOPICS.filter((t) => !(route?.chat_id === chatId && route?.[t.col]))
        if (!missing.length) {
          await tg('sendMessage', { chat_id: chatId, text: 'Все темы уже привязаны. Список: /topics' })
          return new Response('ok')
        }

        const threads: Record<string, number> = {}
        for (const topic of missing) {
          const res = await tg('createForumTopic', { chat_id: chatId, name: topic.name, icon_color: topic.icon })
          if (!res?.ok) {
            await tg('sendMessage', { chat_id: chatId, text: `Не смог создать тему «${topic.name}»: ${res?.description ?? 'нет прав'}. Дай боту права администратора с управлением темами.` })
            return new Response('ok')
          }
          threads[topic.col] = res.result.message_thread_id
        }

        for (const topic of missing) {
          const { error: saveErr } = await supabase.rpc('support_routing_set', {
            p_chat_id: chatId, p_kind: topic.kind, p_thread: threads[topic.col],
          })
          if (saveErr) {
            await tg('sendMessage', { chat_id: chatId, text: `Темы создал, но не сохранил: ${saveErr.message}` })
            return new Response('ok')
          }
        }
        await tg('sendMessage', { chat_id: chatId, text: `✅ Создано тем: ${missing.length} (${missing.map((t) => t.kind).join(', ')}). Список: /topics` })
        return new Response('ok')
      }

      // Что куда привязано: без этого непонятно, какая из одинаковых тем настоящая.
      if (command === '/topics') {
        const supabase = db()
        const { data: modTid } = await supabase.rpc('support_moderator_tid')
        if (!modTid || message.from?.id !== modTid) return new Response('ok')
        const { data: routes } = await supabase.rpc('support_routing_get')
        const route = Array.isArray(routes) ? routes[0] : routes
        if (!route?.chat_id) {
          await tg('sendMessage', { chat_id: chatId, text: 'Группа не настроена. Отправь /setup_support в группе с темами.' })
          return new Response('ok')
        }
        const lines = SUPPORT_TOPICS.map((t) => `${route[t.col] ? '✅' : '⬜️'} ${t.name} — ${t.kind}${route[t.col] ? ` (тема ${route[t.col]})` : ' не привязана'}`)
        await tg('sendMessage', {
          chat_id: chatId,
          text: `Группа ${route.chat_id}\n\n${lines.join('\n')}\n\nПерепривязать: зайди в нужную тему и отправь /setup_support <тип>. Лишние темы удали руками через меню темы.`,
        })
        return new Response('ok')
      }

      if (command === '/start') {
        const ref = parseRef(payload)
        await tg('sendMessage', {
          chat_id: chatId,
          text: (ref ? COPY[lang].welcome_ref : COPY[lang].welcome) + await slotsLine(lang),
          parse_mode: 'HTML',
          reply_markup: openButton(lang, ref),
        })
        if (message.from?.id) await track(message.from.id, 'bot_start', { ref: Boolean(ref), lang })
      } else if (command === '/app') {
        await tg('sendMessage', { chat_id: chatId, text: COPY[lang].welcome + await slotsLine(lang), parse_mode: 'HTML', reply_markup: openButton(lang, null) })
      } else if (command === '/help') {
        await tg('sendMessage', { chat_id: chatId, text: COPY[lang].help, parse_mode: 'HTML', reply_markup: openButton(lang, null) })
      }
    }
  } catch (e) {
    console.error('webhook', String(e)) // Telegram не должен ретраить из-за нашей ошибки
  }
  return new Response('ok')
})

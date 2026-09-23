// Напоминания в боте: итог дня и сброс недели. Зовётся планировщиком pg_cron.
// Защита: заголовок x-digest-secret. Тексты короткие — это пуш, а не статья.
import { createClient } from 'npm:@supabase/supabase-js@2'

const BOT_TOKEN = Deno.env.get('BOT_TOKEN') ?? ''
const WEBAPP_URL = Deno.env.get('WEBAPP_URL') ?? ''
const SECRET = Deno.env.get('DIGEST_SECRET') ?? ''

const kb = {
  inline_keyboard: [[{ text: 'Открыть Driply', web_app: { url: WEBAPP_URL } }]],
}

async function send(chatId: number, text: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', reply_markup: kb }),
    })
    if (res.ok) return true
    const body = await res.json().catch(() => ({}))
    // человек не запускал бота или заблокировал — повторять нет смысла
    if (res.status === 403 || res.status === 400) return false
    const wait = (body?.parameters?.retry_after ?? attempt) * 1000
    await new Promise((r) => setTimeout(r, Math.min(wait, 5000)))
  }
  return false
}

Deno.serve(async (req) => {
  if (!SECRET || req.headers.get('x-digest-secret') !== SECRET) {
    return new Response('forbidden', { status: 403 })
  }
  if (!BOT_TOKEN) return new Response('NO_BOT_TOKEN', { status: 500 })

  const body = await req.json().catch(() => ({}))
  const kind = body?.kind === 'weekly' ? 'weekly' : 'daily'
  const dry = body?.dry === true   // посчитать получателей и тексты, ничего не отправляя
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data, error } = await supabase.rpc(kind === 'weekly' ? 'digest_weekly' : 'digest_daily')
  if (error) {
    console.error('digest rpc', kind, error.message)
    return Response.json({ ok: false, error: error.message }, { status: 400 })
  }

  const rows = Array.isArray(data) ? data : []
  let sent = 0
  for (const row of rows) {
    const text = kind === 'weekly'
      ? (row.rank
          ? `<b>Неделя обнулилась</b>\nТы финишировал #${row.rank} с ${row.score} 💧\nНовая неделя — можно начать сверху`
          : '<b>Неделя обнулилась</b>\nНовая неделя началась. Выложи образ — попадёшь в рейтинг')
      : `Сегодня твои образы собрали <b>+${row.drips} 💧</b>${row.rank ? `\nТы #${row.rank} за неделю` : ''}`
    if (dry) { sent++; continue }
    if (await send(row.tid, text)) sent++
    await new Promise((r) => setTimeout(r, 60))   // не упираемся в лимиты Telegram
  }

  console.log(`digest ${kind}: получателей ${rows.length}, отправлено ${sent}${dry ? ' (dry)' : ''}`)
  return Response.json({ ok: true, kind, dry, recipients: rows.length, sent, sample: rows.slice(0, 3) })
})

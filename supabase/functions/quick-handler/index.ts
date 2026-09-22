import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

async function validateInitData(initData, botToken) {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')
  const dataCheckString = [...params.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n')
  const enc = new TextEncoder()
  const secretKeyRaw = await crypto.subtle.importKey('raw', enc.encode('WebAppData'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const secret = await crypto.subtle.sign('HMAC', secretKeyRaw, enc.encode(botToken))
  const signKey = await crypto.subtle.importKey('raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', signKey, enc.encode(dataCheckString))
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('')
  if (hex !== hash) return null
  const userRaw = params.get('user')
  return userRaw ? JSON.parse(userRaw) : null
}

// Telegram отвечает 429 с retry_after и иногда 5xx — повторяем, ошибки пишем в логи функции
async function sendTg(botToken, chatId, text, attempt = 1) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text }),
    })
    if (res.ok) return true
    const body = await res.json().catch(() => ({}))
    // 403 — человек не запускал бота или заблокировал его, повторять бессмысленно
    if (res.status === 403 || res.status === 400) {
      console.error('sendTg refused', chatId, res.status, body?.description ?? '')
      return false
    }
    if (attempt <= 3) {
      const wait = (body?.parameters?.retry_after ?? attempt) * 1000
      await new Promise((r) => setTimeout(r, Math.min(wait, 5000)))
      return sendTg(botToken, chatId, text, attempt + 1)
    }
    console.error('sendTg failed', chatId, res.status, body?.description ?? '')
    return false
  } catch (e) {
    if (attempt <= 3) {
      await new Promise((r) => setTimeout(r, attempt * 500))
      return sendTg(botToken, chatId, text, attempt + 1)
    }
    console.error('sendTg error', chatId, String(e))
    return false
  }
}

function runInBackground(task) {
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task)
  else void task
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const body = await req.json()
    const botToken = Deno.env.get('BOT_TOKEN')
    if (!botToken) return jsonResponse({ error: 'NO_BOT_TOKEN' }, 500)

    const tgUser = await validateInitData(body.initData ?? '', botToken)
    if (!tgUser) return jsonResponse({ error: 'AUTH_FAILED' }, 401)

    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))
    const uname = tgUser.username ?? tgUser.first_name ?? 'user'

    if (body.action === 'set_profile') {
      const { data, error } = await supabase.rpc('set_profile', {
        p_tid: tgUser.id, p_username: uname,
        p_avatar: body.avatar_url ?? body.avatar ?? tgUser.photo_url ?? null,
        p_display_name: body.display_name ?? body.name ?? null,
        p_bio: body.bio ?? null,
        p_hide_username: typeof body.hide_username === 'boolean' ? body.hide_username : null,
        p_gender: body.gender ?? null,
        p_allow_dm: typeof body.allow_dm === 'boolean' ? body.allow_dm : null,
      })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse(data, 200)
    }

    // аналитика воронки: не задерживаем ответ, ошибки видны в логах функции
    if (body.action === 'track') {
      const kind = String(body.kind ?? '').slice(0, 40)
      const meta = body.meta && typeof body.meta === 'object' ? body.meta : {}
      if (kind) {
        runInBackground(
          supabase.rpc('track_event', { p_tid: tgUser.id, p_kind: kind, p_meta: meta })
            .then(({ error }) => { if (error) console.error('track_event', kind, error.message) }),
        )
      }
      return jsonResponse({ ok: true }, 200)
    }

    if (body.action === 'set_notify_prefs') {
      const { data, error } = await supabase.rpc('set_notify_prefs', {
        p_tid: tgUser.id, p_prefs: body.prefs ?? {},
      })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse(data, 200)
    }

    if (body.action === 'create_post') {
      const { data, error } = await supabase.rpc('create_post', {
        p_tid: tgUser.id, p_username: uname, p_avatar: tgUser.photo_url ?? null,
        p_media_url: body.media_url, p_caption: body.caption ?? '', p_items: body.items ?? [],
        p_style_id: body.style_id ?? null,
        p_style2_id: body.style2_id ?? null,
        p_extra_media: Array.isArray(body.extra_media) ? body.extra_media.slice(0, 2) : [],
      })
      if (error) return jsonResponse({ error: error.message }, 400)
      if (data?.ref_bonus > 0) {
        if (data.ref_tid && data.ref_notify !== false) {
          runInBackground(sendTg(botToken, data.ref_tid, `🎉 Твой реферал засчитан! +500 💧 за приглашённого друга`))
        }
        if (data.newbie_notify !== false) {
          runInBackground(sendTg(botToken, tgUser.id, `🎉 Бонус за реферала! +200 💧 начислено на баланс`))
        }
      }
      return jsonResponse(data, 200)
    }

    if (body.action === 'set_referrer') {
      const code = String(body.ref_code ?? body.ref_id ?? '')
      if (!code) return jsonResponse({ ok: false, reason: 'bad_code' }, 200)
      const { data, error } = await supabase.rpc('set_referrer_code', { p_tid: tgUser.id, p_code: code })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse(data, 200)
    }

    if (body.action === 'set_follow') {
      const { data, error } = await supabase.rpc('set_follow', {
        p_tid: tgUser.id, p_username: uname, p_avatar: tgUser.photo_url ?? null,
        p_target: body.target_id, p_follow: !!body.follow,
      })
      if (error) return jsonResponse({ error: error.message }, 400)
      if (data?.new_follow && data?.target_tid && data?.notify !== false) {
        runInBackground(sendTg(botToken, data.target_tid, `👀 ${data.follower_name || 'Кто-то'} подписался на тебя в Driply`))
      }
      return jsonResponse(data, 200)
    }

    if (body.action === 'set_block') {
      const { data, error } = await supabase.rpc('set_block', {
        p_tid: tgUser.id, p_target: body.target_id, p_block: !!body.block,
      })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse(data, 200)
    }

    if (body.action === 'reward_story') {
      const { data, error } = await supabase.rpc('reward_story', { p_tid: tgUser.id })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse(data, 200)
    }

    if (body.action === 'set_post_hidden') {
      const { data, error } = await supabase.rpc('set_post_hidden', {
        p_tid: tgUser.id, p_post: body.post_id, p_hidden: !!body.hidden,
      })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse(data, 200)
    }

    if (body.action === 'delete_post') {
      const { data, error } = await supabase.rpc('delete_post', {
        p_tid: tgUser.id, p_post: body.post_id,
      })
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse(data, 200)
    }

    if (body.action === 'report') {
      const reason = String(body.reason ?? 'other')
      const fn = body.post_id ? 'report_post' : 'report_user'
      const args = body.post_id
        ? { p_tid: tgUser.id, p_post: body.post_id, p_reason: reason }
        : { p_tid: tgUser.id, p_target: body.target_id, p_reason: reason }
      const { data, error } = await supabase.rpc(fn, args)
      if (error) return jsonResponse({ error: error.message }, 400)
      return jsonResponse(data, 200)
    }

    if (body.action !== 'cast_vote') {
      return jsonResponse({ error: 'UNKNOWN_ACTION' }, 400)
    }

    const { data, error } = await supabase.rpc('cast_vote', {
      p_tid: tgUser.id, p_username: uname, p_avatar: tgUser.photo_url ?? null,
      p_post: body.post_id, p_amount: body.amount,
    })
    if (error) return jsonResponse({ error: error.message }, 400)
    if (data?.author_tid && data?.author_notify !== false) {
      runInBackground(sendTg(botToken, data.author_tid, `💧 ${data.voter_name || 'Кто-то'} оценил твой образ на +${data.amount}`))
    }
    return jsonResponse(data, 200)
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500)
  }
})
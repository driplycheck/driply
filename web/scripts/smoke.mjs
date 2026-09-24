// Тестировщик: проходит по живому приложению и по бэкенду, ищет сломанное.
//
//   node scripts/smoke.mjs                      # проверить прод, вывести отчёт
//   node scripts/smoke.mjs --report             # ещё и отправить отчёт в тему «Отчёты»
//   SMOKE_URL=http://localhost:5173 node ...    # проверить что-то другое
//
// Приватные чтения подделываются, как в стенде скриншотов: без подписи Telegram
// сервер их не отдаёт, а проверяем мы отрисовку экранов. Бэкенд проверяется отдельно,
// настоящими запросами. Ничего никуда не пишет: прогон безопасен для прода.
import { chromium } from 'playwright'
import { loadEnv } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdir } from 'node:fs/promises'

const root = fileURLToPath(new URL('..', import.meta.url))
const env = { ...loadEnv('', root, ''), ...process.env }
const URL_APP = env.SMOKE_URL || 'https://driply-five.vercel.app'
const SUPA = env.VITE_SUPABASE_URL
const ANON = env.VITE_SUPABASE_ANON_KEY
const HOOK = env.TG_WEBHOOK_URL || (SUPA ? `${SUPA}/functions/v1/tg-webhook` : null)
const SECRET = env.CI_SECRET || env.TG_WEBHOOK_SECRET
const USER_ID = Number(env.SHOTS_USER_ID) || 1
const TG_ID = Number(env.SHOTS_TG_ID) || 1

const SHOT_DIR = root + '.smoke'
const results = []
const ok = (name, note = '') => results.push({ name, ok: true, note })
const bad = (name, note) => results.push({ name, ok: false, note: String(note).slice(0, 200) })

let shotPage = null   // страница, с которой снимаем кадр упавшей проверки

async function check(name, fn) {
  try {
    const note = await fn()
    ok(name, note ?? '')
  } catch (e) {
    let where = ''
    if (shotPage) {
      const file = `${SHOT_DIR}/${name.replace(/[^a-zа-я0-9]+/gi, '-')}.png`
      await shotPage.screenshot({ path: file }).catch(() => {})
      where = ` [кадр: ${file}]`
    }
    bad(name, String(e?.message ?? e).split('\n')[0] + where)
  }
}

const FAKE_READS = {
  my_profile: {
    id: USER_ID, display_name: 'smoke', avatar_url: null, bio: '', style_score: 0,
    hide_username: false, daily_credits: 200, is_founder: false, gender: null, allow_dm: true, notify_prefs: {},
  },
  my_posts: [], my_votes: [], my_blocks: [],
  ref_stats: { invited: 0, earned: 0, my_id: USER_ID, ref_code: 'smoke' }, ref_invited_list: [],
}

// --- бэкенд: настоящие запросы, без подделок ---
async function tryFetch(url, init, attempt = 1) {
  try {
    return await fetch(url, init)
  } catch (e) {
    if (attempt >= 3) throw e
    await new Promise((r) => setTimeout(r, 400 * attempt))
    return tryFetch(url, init, attempt + 1)
  }
}

async function rpc(name, body) {
  const res = await tryFetch(`${SUPA}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${name}: HTTP ${res.status} ${(await res.text()).slice(0, 120)}`)
  return res.json()
}

async function backendChecks() {
  if (!SUPA || !ANON) { bad('бэкенд', 'нет VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY'); return }

  await check('лента отдаётся сервером', async () => {
    const data = await rpc('main_feed', { p_uid: null })
    if (!Array.isArray(data)) throw new Error('ответ не массив')
    return `${data.length} образов`
  })
  await check('рейтинг отдаётся сервером', async () => {
    const data = await rpc('leaderboard', { p_period: 'week', p_tid: null, p_limit: 10 })
    if (!Array.isArray(data?.items)) throw new Error('нет списка items')
    return `${data.items.length} строк, сброс ${String(data.reset_at).slice(0, 10)}`
  })
  await check('поиск людей отвечает', async () => {
    const data = await rpc('search_people', { p_uid: null, p_q: 'a' })
    if (!Array.isArray(data)) throw new Error('ответ не массив')
    return `${data.length} найдено`
  })
  await check('свободные места first drip', async () => `осталось ${await rpc('first_drip_left', {})}`)

  await check('роутер отбивает запрос без подписи', async () => {
    const res = await tryFetch(`${SUPA}/functions/v1/quick-handler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
      body: JSON.stringify({ action: 'set_follow', initData: 'подделка', target_id: 1, follow: true }),
    })
    if (res.status !== 401) throw new Error(`ждали 401, пришло ${res.status}`)
    return 'AUTH_FAILED, как и должно быть'
  })

  if (!HOOK || !SECRET) { bad('бот', 'нет CI_SECRET'); return }
  await check('бот и его связи', async () => {
    const res = await tryFetch(`${HOOK}?health=${encodeURIComponent(SECRET)}`)
    const json = await res.json().catch(() => ({}))
    if (!json.ok) throw new Error(JSON.stringify(json.checks ?? json).slice(0, 200))
    const c = json.checks
    return `@${c.bot}, темы: ${(c.topics || []).join(', ') || 'нет'}`
  })
}

// --- приложение: настоящий браузер, настоящие клики ---
async function uiChecks() {
  const browser = await chromium.launch()
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  const errors = []

  await ctx.addInitScript(() => {
    // на about:blank доступа к хранилищу нет — без try прогон падает на ровном месте
    try {
      localStorage.setItem('driply_lang', 'ru')
      localStorage.setItem('driply_theme_preview', '1')
    } catch {}
  })
  await ctx.route('**/functions/v1/quick-handler', async (route) => {
    const body = route.request().postDataJSON?.() ?? {}
    if (body.action === 'read' && body.fn in FAKE_READS) return route.fulfill({ json: FAKE_READS[body.fn] })
    return route.fulfill({ json: { ok: true } })
  })
  await ctx.route('https://telegram.org/**', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }))
  await ctx.addInitScript((id) => {
    window.Telegram = { WebApp: {
      initData: '', initDataUnsafe: { user: { id, language_code: 'ru' } }, colorScheme: 'dark', version: '6.0',
      platform: 'android', ready() {}, expand() {}, onEvent() {}, offEvent() {}, isVersionAtLeast: () => false,
      BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} }, HapticFeedback: {},
    } }
  }, TG_ID)

  const page = await ctx.newPage()
  shotPage = page
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

  // первая загрузка иногда упирается в холодный старт хостинга — даём три попытки,
  // иначе тестировщик поднимает ложную тревогу на пустом месте
  const home = async () => {
    let last
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await page.goto(URL_APP, { waitUntil: 'commit', timeout: 45000 })
        await page.locator('.ui-tabbar').waitFor({ timeout: 25000 })
        return
      } catch (e) {
        last = e
        await page.waitForTimeout(1500)
      }
    }
    throw last
  }

  await check('приложение открывается', async () => {
    await home()
    return URL_APP
  })

  await check('лента показывает образы', async () => {
    const cards = page.locator('.ocard')
    await cards.first().waitFor({ timeout: 15000 })
    const n = await cards.count()
    if (n === 0) throw new Error('ни одной карточки')
    return `${n} карточек на экране`
  })

  await check('профиль автора открывается', async () => {
    await page.locator('.ocard__author').first().click({ timeout: 8000 })
    await page.locator('.profile').waitFor({ timeout: 10000 })
    await page.goBack().catch(() => {})
    await home()
  })

  await check('рейтинг и переключение периода', async () => {
    await home()
    await page.locator('.ui-tab').nth(2).click({ timeout: 8000 })
    await page.locator('.lb-seg__opt').first().waitFor({ timeout: 10000 })
    await page.locator('.lb-seg__opt').nth(1).click({ timeout: 8000 })
    await page.waitForTimeout(800)
    const rows = await page.locator('.lrow').count()
    return `${rows} строк в рейтинге`
  })

  await check('поиск открывается', async () => {
    await home()
    await page.locator('.ui-tab').nth(1).click({ timeout: 8000 })
    await page.locator('input').first().waitFor({ timeout: 10000 })
  })

  await check('композер открывается с кнопкой фото', async () => {
    await home()
    await page.locator('.ui-tabbar__create').click({ timeout: 8000 })
    await page.locator('.photoway').first().waitFor({ timeout: 10000 })
    const ways = await page.locator('.photoway').count()
    await page.locator('.composer__close').click({ timeout: 8000 })
    return `способов добавить фото: ${ways}`
  })

  const openSettings = async () => {
    await home()
    await page.locator('.ui-tab').nth(3).click({ timeout: 8000 })
    await page.locator('.profile').waitFor({ timeout: 10000 })
    await page.locator('[aria-label="Настройки"]').click({ timeout: 8000 })
    await page.locator('.settings').waitFor({ timeout: 10000 })
  }

  await check('настройки и поддержка открываются', async () => {
    await openSettings()
    await page.getByText('Поддержка', { exact: true }).click({ timeout: 8000 })
    await page.locator('.support__lead').waitFor({ timeout: 10000 })
  })

  await check('темы переключаются', async () => {
    await openSettings()
    await page.getByText('Оформление', { exact: true }).click({ timeout: 8000 })
    await page.waitForTimeout(600)
    const before = await page.evaluate(() => document.documentElement.dataset.theme)
    const options = page.locator('button').filter({ hasText: /Светлая|Тёмная|Цветная/ })
    const n = await options.count()
    if (!n) throw new Error('на экране оформления нет вариантов темы')
    for (let i = 0; i < n; i++) {
      await options.nth(i).click({ timeout: 8000 })
      await page.waitForTimeout(400)
      const after = await page.evaluate(() => document.documentElement.dataset.theme)
      if (after !== before) return `${before} → ${after}`
    }
    throw new Error(`тема не сменилась, осталась ${before}`)
  })

  // шум вроде отменённых запросов отфильтровываем: интересны только настоящие поломки
  const real = errors.filter((e) => !/Failed to load resource|net::ERR_ABORTED|favicon/i.test(e))
  if (real.length) bad('ошибок в консоли нет', real.slice(0, 3).join(' | '))
  else ok('ошибок в консоли нет')

  await browser.close()
}

await mkdir(SHOT_DIR, { recursive: true })
await backendChecks()
await uiChecks()

const failed = results.filter((r) => !r.ok)
const lines = results.map((r) => `${r.ok ? '✅' : '❌'} ${r.name}${r.note ? ` — ${r.note}` : ''}`)
const head = failed.length
  ? `🔴 <b>Тестировщик: ${failed.length} из ${results.length} проверок упало</b>`
  : `🟢 <b>Тестировщик: все ${results.length} проверок прошли</b>`

console.log('\n' + head.replace(/<\/?b>/g, '') + '\n' + lines.join('\n') + '\n')

// --report-on-fail: молчим, пока всё зелёное. Нужен после пуша, чтобы не шуметь каждый раз.
const wantsReport = process.argv.includes('--report')
  || (process.argv.includes('--report-on-fail') && failed.length > 0)

if (wantsReport) {
  if (!HOOK || !SECRET) {
    console.error('Отчёт не отправлен: нет CI_SECRET')
  } else {
    const res = await fetch(`${HOOK}?report=${encodeURIComponent(SECRET)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `${head}\n\n${lines.join('\n')}` }),
    })
    const json = await res.json().catch(() => ({}))
    console.log(json.ok ? 'Отчёт отправлен в тему «Отчёты».' : `Отчёт не отправлен: ${json.error ?? json.description ?? res.status}`)
  }
}

process.exit(failed.length ? 1 : 0)

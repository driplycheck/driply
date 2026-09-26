// Быстрый взгляд на прод: четыре главных экрана, без сборки и без локального сервера.
// Нужен агенту-тестировщику. Полный стенд скриншотов собирает приложение локально
// и занимает десятки минут; для «посмотреть, не поехало ли» этого достаточно.
//
//   node scripts/glance.mjs
//   SMOKE_URL=http://localhost:4173 node scripts/glance.mjs
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('../.shots/', import.meta.url))
const URL_APP = process.env.SMOKE_URL || 'https://driply-five.vercel.app'
const USER_ID = Number(process.env.SHOTS_USER_ID) || 1
const TG_ID = Number(process.env.SHOTS_TG_ID) || 1

// Приватные чтения подделываем: без подписи Telegram сервер их не отдаёт,
// а нам нужны экраны «как у обычного человека».
const FAKE = {
  my_profile: {
    id: USER_ID, display_name: 'smoke', avatar_url: null, bio: '', style_score: 250,
    hide_username: false, daily_credits: 1460, is_founder: true, gender: 'male',
    allow_dm: true, notify_prefs: {}, terms_version: '2026-09-26',
  },
  my_posts: [], my_votes: [], my_blocks: [],
  ref_stats: { invited: 0, earned: 0, my_id: USER_ID, ref_code: 'x' }, ref_invited_list: [],
}

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })

await ctx.addInitScript(() => {
  try {
    localStorage.setItem('driply_theme_preview', '1')
    localStorage.setItem('driply_theme', 'dark')
    localStorage.setItem('driply_lang', 'ru')
  } catch { /* приватный режим */ }
})
await ctx.route('**/functions/v1/quick-handler', (r) => {
  const b = r.request().postDataJSON?.() ?? {}
  return r.fulfill({ json: b.action === 'read' && b.fn in FAKE ? FAKE[b.fn] : { ok: true } })
})
await ctx.route('https://telegram.org/**', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }))
await ctx.addInitScript((id) => {
  window.Telegram = { WebApp: {
    initData: '', initDataUnsafe: { user: { id, language_code: 'ru' } }, colorScheme: 'dark',
    version: '6.0', platform: 'android', ready() {}, expand() {}, onEvent() {}, offEvent() {},
    isVersionAtLeast: () => false,
    BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} }, HapticFeedback: {},
  } }
}, TG_ID)

const page = await ctx.newPage()
const shot = async (name) => { await page.screenshot({ path: `${OUT}${name}.png` }); console.log('снято', name) }
const home = async () => {
  await page.goto(URL_APP, { waitUntil: 'commit', timeout: 45000 })
  await page.locator('.ui-tabbar').waitFor({ timeout: 30000 })
}
const openProfile = async () => {
  await home()
  await page.locator('.ui-tab').nth(3).click({ timeout: 10000 })
  await page.locator('.profile').waitFor({ timeout: 15000 })
}

try {
  await home()
  await page.locator('.ocard').first().waitFor({ timeout: 20000 }).catch(() => {})
  await page.waitForTimeout(2500)
  await shot('lenta')

  await openProfile()
  await page.waitForTimeout(1200)
  await shot('profil')

  await home()
  await page.locator('.ui-tabbar__create').click({ timeout: 10000 })
  await page.locator('.composer').waitFor({ timeout: 15000 })
  await page.waitForTimeout(800)
  await shot('composer')

  await openProfile()
  await page.locator('[aria-label="Настройки"]').click({ timeout: 10000 })
  await page.locator('.settings').waitFor({ timeout: 15000 })
  await page.waitForTimeout(800)
  await shot('nastroyki')
} catch (e) {
  console.error('не все экраны сняты:', String(e.message).split('\n')[0])
} finally {
  await browser.close()
}

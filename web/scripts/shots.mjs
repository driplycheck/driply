// npm run shots — собирает приложение и снимает ключевые экраны во всех темах.
// Нужен web/.env.local с VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (данные — живая лента, только чтение).
// Результат: web/.shots/<экран>-<тема>.png
import { build, preview, loadEnv } from 'vite'
import { chromium } from 'playwright'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = root + '.shots'
const distDir = outDir + '/dist'
const THEMES = (process.argv[2] || 'dark,light,neon').split(',')
// SHOTS_TG_ID в .env.local — снимать «как юзер»: my_profile читается, записи без подписи Telegram не пройдут
const TG_ID = Number(loadEnv('', root, 'SHOTS_').SHOTS_TG_ID) || null

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
// картинка для загрузки в композер: 1x1 PNG, файл нужен только как вход для input[type=file]
const uploadFixture = outDir + '/_upload.png'
await writeFile(uploadFixture, Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
))
await build({ root, logLevel: 'error', build: { outDir: distDir, emptyOutDir: true } })
const server = await preview({ root, logLevel: 'error', build: { outDir: distDir }, preview: { port: 4174, strictPort: true } })
const url = 'http://localhost:4174/'

const pause = (page, ms = 1200) => page.waitForTimeout(ms)
const home = async (page) => {
  await page.goto(url, { waitUntil: 'load' })
  await page.locator('.ocard').first().waitFor({ timeout: 40000 })
  await pause(page, 800)
}

// каждый сценарий начинает с ленты и доводит до нужного экрана
// лента с каруселью и ценой: дописываем первому посту доп. фото прямо в ответ main_feed
async function withCarousel(page) {
  await page.route('**/rpc/main_feed', async (route) => {
    const res = await route.fetch()
    const posts = await res.json()
    if (posts[0]) {
      posts[0].extra_media = posts.slice(1, 3).map((x) => x.media_url)
      posts[0].style2 = posts[0].style2 || { id: -1, name_ru: 'Кэжуал', name_en: 'Casual' }
      if (posts[0].post_items?.[0]) posts[0].post_items[0].price = 4500
    }
    await route.fulfill({ response: res, json: posts })
  })
}

const SCREENS = {
  feed: async () => {},
  carousel: async (p) => { await pause(p, 2500); await p.locator('.ocard__icon').first().click().catch(() => {}); await pause(p, 300) },
  picker: async (p) => { await p.locator('.dripctl .ui-btn').first().click(); await pause(p, 300) },
  profile: async (p) => { await p.locator('.ocard__author').first().click(); await pause(p, 1500) },
  post: async (p) => { await p.locator('.ocard__author').first().click(); await pause(p, 1500); await p.locator('.grid__item').first().click(); await pause(p, 1500) },
  top: async (p) => { await p.locator('.ui-tab').nth(2).click(); await pause(p, 1500) },
  'top-month': async (p) => { await p.locator('.ui-tab').nth(2).click(); await pause(p, 1200); await p.locator('.lb-seg__opt').nth(1).click(); await pause(p, 1500) },
  'top-all': async (p) => { await p.locator('.ui-tab').nth(2).click(); await pause(p, 1200); await p.locator('.lb-seg__opt').nth(2).click(); await pause(p, 1500) },
  search: async (p) => { await p.locator('.ui-tab').nth(1).click(); await pause(p, 1500) },
  composer: async (p) => { await p.locator('.ui-tabbar__create').click(); await pause(p) },
  'composer-filled': async (p) => {
    await p.locator('.ui-tabbar__create').click(); await pause(p, 600)
    const img = uploadFixture
    await p.locator('.photo input[type=file]').setInputFiles(img); await pause(p, 300)
    await p.locator('.photos__add input[type=file]').setInputFiles(img); await pause(p, 300)
    await p.locator('.photos__add input[type=file]').setInputFiles(img); await pause(p, 300)
    await p.locator('.stylepick .ui-chip').nth(0).click(); await p.locator('.stylepick .ui-chip').nth(2).click()
    await p.locator('.tagrow .toggle').click(); await pause(p, 300)
    await pause(p, 300)
  },
  earn: async (p) => { await p.locator('.ui-tab').nth(2).click(); await pause(p, 1500); await p.locator('.mydrips__how').click(); await pause(p, 400) },
  me: async (p) => { await p.locator('.ui-tab').nth(3).click(); await pause(p, 1500) },
  settings: async (p) => { await p.locator('.ui-tab').nth(3).click(); await pause(p, 1500); await p.locator('.profile__icon').last().click(); await pause(p, 600) },
  appearance: async (p) => { await p.locator('.ui-tab').nth(3).click(); await pause(p, 1500); await p.locator('.profile__icon').last().click(); await pause(p, 600); await p.locator('.srow--tap').nth(1).click(); await pause(p, 600) },
  edit: async (p) => { await p.locator('.ui-tab').nth(3).click(); await pause(p, 1500); await p.locator('.profile__actions .ui-btn--secondary').click(); await pause(p, 600) },
}

const browser = await chromium.launch()
let failed = 0
for (const theme of THEMES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await ctx.addInitScript((th) => {
    localStorage.setItem('driply_theme_preview', '1')
    localStorage.setItem('driply_theme', th)
    localStorage.setItem('driply_lang', 'ru')
  }, theme)
  if (TG_ID) {
    await ctx.route('https://telegram.org/**', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }))
    await ctx.addInitScript((id) => {
      window.Telegram = { WebApp: {
        initData: '', initDataUnsafe: { user: { id, language_code: 'ru' } }, colorScheme: 'dark', version: '6.0',
        ready() {}, expand() {}, onEvent() {}, offEvent() {}, isVersionAtLeast: () => false,
        BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} }, HapticFeedback: {},
      } }
    }, TG_ID)
  }
  const page = await ctx.newPage()
  page.on('pageerror', (e) => { failed++; console.error(`✗ ${theme}: ${e.message}`) })
  for (const [name, go] of Object.entries(SCREENS)) {
    // один повтор: живая лента из Supabase иногда отвечает медленно
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        if (name === 'carousel') await withCarousel(page)
        await home(page)
        await go(page)
        if (name === 'carousel') await page.unroute('**/rpc/main_feed')
        await page.screenshot({ path: `${outDir}/${name}-${theme}.png` })
        console.log(`✓ ${name}-${theme}`)
        break
      } catch (e) {
        if (attempt === 3) { failed++; console.error(`✗ ${name}-${theme}: ${e.message.split('\n')[0]}`) }
      }
    }
  }
  await ctx.close()
}
await browser.close()
server.httpServer.close()
await rm(distDir, { recursive: true, force: true })
console.log(failed ? `\n⚠️  Ошибок: ${failed}` : `\nГотово: ${outDir}`)
process.exit(failed ? 1 : 0)

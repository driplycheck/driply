// npm run shots — собирает приложение и снимает ключевые экраны во всех темах.
// Нужен web/.env.local с VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (данные — живая лента, только чтение).
// Результат: web/.shots/<экран>-<тема>.png
import { build, preview, loadEnv } from 'vite'
import { chromium } from 'playwright'
import { mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const outDir = root + '.shots'
const distDir = outDir + '/dist'
const THEMES = (process.argv[2] || 'dark,light,neon').split(',')
// SHOTS_TG_ID в .env.local — снимать «как юзер»: my_profile читается, записи без подписи Telegram не пройдут
const TG_ID = Number(loadEnv('', root, 'SHOTS_').SHOTS_TG_ID) || null

await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
await build({ root, logLevel: 'error', build: { outDir: distDir, emptyOutDir: true } })
const server = await preview({ root, logLevel: 'error', build: { outDir: distDir }, preview: { port: 4174, strictPort: true } })
const url = 'http://localhost:4174/'

const pause = (page, ms = 1200) => page.waitForTimeout(ms)
const home = async (page) => {
  await page.goto(url, { waitUntil: 'load' })
  await page.locator('.ocard').first().waitFor({ timeout: 20000 })
  await pause(page, 800)
}

// каждый сценарий начинает с ленты и доводит до нужного экрана
const SCREENS = {
  feed: async () => {},
  picker: async (p) => { await p.locator('.dripctl .ui-btn').first().click(); await pause(p, 300) },
  profile: async (p) => { await p.locator('.ocard__author').first().click(); await pause(p, 1500) },
  post: async (p) => { await p.locator('.ocard__author').first().click(); await pause(p, 1500); await p.locator('.grid__item').first().click(); await pause(p, 1500) },
  top: async (p) => { await p.locator('.ui-tab').nth(2).click(); await pause(p, 1500) },
  search: async (p) => { await p.locator('.ui-tab').nth(1).click(); await pause(p, 1500) },
  composer: async (p) => { await p.locator('.ui-tabbar__create').click(); await pause(p) },
  earn: async (p) => { await p.locator('.ui-tab').nth(2).click(); await pause(p, 1500); await p.locator('.mydrips__how').click(); await pause(p, 400) },
  me: async (p) => { await p.locator('.ui-tab').nth(3).click(); await pause(p, 1500) },
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
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await home(page)
        await go(page)
        await page.screenshot({ path: `${outDir}/${name}-${theme}.png` })
        console.log(`✓ ${name}-${theme}`)
        break
      } catch (e) {
        if (attempt === 2) { failed++; console.error(`✗ ${name}-${theme}: ${e.message.split('\n')[0]}`) }
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

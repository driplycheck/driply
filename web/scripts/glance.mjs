// Быстрый взгляд на прод: главные экраны в нескольких темах и на разных по высоте
// телефонах, без сборки и без локального сервера. Нужен тестировщику и дизайнеру.
// Полный стенд скриншотов собирает приложение локально и занимает десятки минут;
// для «посмотреть, не поехало ли» этого достаточно.
//
//   node scripts/glance.mjs
//   SMOKE_URL=http://localhost:4173 node scripts/glance.mjs
//
// Короткий экран здесь не для красоты: на невысоком телефоне панели и кнопки
// накладываются друг на друга, и такие баги на 844 пикселях не видны вообще.
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

// Что снимаем: тема, высота экрана и список экранов. Высокий телефон — полный обход,
// низкий и светлая тема — только лента и профиль, чтобы прогон оставался быстрым.
const PASSES = [
  { theme: 'dark', height: 844, screens: ['lenta', 'profil', 'composer', 'nastroyki'] },
  { theme: 'dark', height: 560, screens: ['lenta', 'stili'] },
  { theme: 'light', height: 844, screens: ['lenta', 'profil'] },
]

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch()

for (const pass of PASSES) {
  const tag = `${pass.theme}-${pass.height}`
  const ctx = await browser.newContext({
    viewport: { width: 390, height: pass.height },
    deviceScaleFactor: 2,
  })

  await ctx.addInitScript((theme) => {
    try {
      localStorage.setItem('driply_theme_preview', '1')
      localStorage.setItem('driply_theme', theme)
      localStorage.setItem('driply_lang', 'ru')
    } catch { /* приватный режим */ }
  }, pass.theme)
  await ctx.route('**/functions/v1/quick-handler', (r) => {
    const b = r.request().postDataJSON?.() ?? {}
    return r.fulfill({ json: b.action === 'read' && b.fn in FAKE ? FAKE[b.fn] : { ok: true } })
  })
  await ctx.route('https://telegram.org/**', (r) => r.fulfill({ contentType: 'text/javascript', body: '' }))
  await ctx.addInitScript(([id, theme, h]) => {
    window.Telegram = { WebApp: {
      initData: '', initDataUnsafe: { user: { id, language_code: 'ru' } }, colorScheme: theme,
      version: '6.0', platform: 'android', ready() {}, expand() {}, onEvent() {}, offEvent() {},
      isVersionAtLeast: () => false,
      // высоту приложение берёт отсюда: без неё короткий экран притворялся высоким
      viewportHeight: h, viewportStableHeight: h,
      BackButton: { show() {}, hide() {}, onClick() {}, offClick() {} }, HapticFeedback: {},
    } }
  }, [TG_ID, pass.theme, pass.height])

  const page = await ctx.newPage()
  const shot = async (name) => {
    await page.screenshot({ path: `${OUT}${name}-${tag}.png` })
    // Пустой экран выглядит как снятый, и по нему легко сделать ложный вывод:
    // «профиль не найден» однажды уже уехало в отчёт как нормальная картинка.
    const empty = await page.locator('.profile__state, .feed-state').first()
      .isVisible({ timeout: 500 }).catch(() => false)
    console.log('снято', `${name}-${tag}`, empty ? '⚠️ на экране пусто, это не настоящий вид' : '')
  }
  const home = async () => {
    await page.goto(URL_APP, { waitUntil: 'commit', timeout: 45000 })
    await page.locator('.ui-tabbar').waitFor({ timeout: 30000 })
  }

  const steps = {
    lenta: async () => {
      await home()
      await page.locator('.ocard').first().waitFor({ timeout: 20000 }).catch(() => {})
      await page.waitForTimeout(2500)
      await shot('lenta')
    },
    // панель стилей поверх карточки — место, где элементы уже сталкивались
    stili: async () => {
      await home()
      await page.locator('.ocard').first().waitFor({ timeout: 20000 }).catch(() => {})
      await page.waitForTimeout(1500)
      const toggle = page.locator('.feed-filter').first()
      if (await toggle.count()) {
        await toggle.click({ timeout: 5000 })
        await page.locator('.feed-chips').waitFor({ timeout: 5000 }).catch(() => {})
      }
      await page.waitForTimeout(900)
      await shot('stili')
    },
    profil: async () => {
      await home()
      await page.locator('.ui-tab').nth(3).click({ timeout: 10000 })
      await page.locator('.profile').waitFor({ timeout: 15000 })
      await page.waitForTimeout(1200)
      await shot('profil')
    },
    composer: async () => {
      await home()
      await page.locator('.ui-tabbar__create').click({ timeout: 10000 })
      await page.locator('.composer').waitFor({ timeout: 15000 })
      await page.waitForTimeout(800)
      await shot('composer')
    },
    nastroyki: async () => {
      await home()
      await page.locator('.ui-tab').nth(3).click({ timeout: 10000 })
      await page.locator('.profile').waitFor({ timeout: 15000 })
      await page.locator('[aria-label="Настройки"]').click({ timeout: 10000 })
      await page.locator('.settings').waitFor({ timeout: 15000 })
      await page.waitForTimeout(800)
      await shot('nastroyki')
    },
  }

  for (const name of pass.screens) {
    // один упавший экран не должен уносить остальные: снимаем что получится
    try {
      await steps[name]()
    } catch (e) {
      console.error(`не снял ${name}-${tag}:`, String(e.message).split('\n')[0])
    }
  }
  await ctx.close()
}

await browser.close()

// Генератор ТГ-пака: обложки постов (1280×720) и кастомные эмодзи (100×100, прозрачные).
// Запуск: node marketing/make-pack.mjs   (нужен playwright — стоит в web/)
import { chromium } from '../web/node_modules/playwright/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import { CATEGORY_ICONS, STYLE_ICONS } from '../web/src/components/ui/icon-paths.js'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('./tg-pack/', import.meta.url))
await mkdir(OUT + 'covers', { recursive: true })
await mkdir(OUT + 'covers-preview', { recursive: true })
await mkdir(OUT + 'emoji', { recursive: true })

const INK = '#09090B', LIME = '#C6FF3D', VIOLET = '#7C5CFF', PINK = '#FF4D8D', SURFACE = '#1C1C22'
// палитры тем приложения — обложки постов про оформление рисуются каждая в своей
const THEMES = {
  dark: { bg: '#0A0A0A', text: '#F5F5F5', muted: '#8A8A8A', accent: '#F2F2F2', drip: LIME, glow: 'transparent' },
  light: { bg: '#F3F1EC', text: '#111111', muted: '#7A766E', accent: '#111111', drip: '#111111', glow: 'transparent' },
  neon: { bg: INK, text: '#F5F5F7', muted: '#8A8A96', accent: LIME, drip: LIME, glow: VIOLET },
}

const FONTS = `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@700;900&display=swap">`

const coin = (size, bg = LIME, fg = INK) => `<span style="display:inline-grid;place-items:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};color:${fg};font-family:Unbounded;font-weight:900;font-size:${size * 0.58}px;line-height:1">d</span>`

// обложки: разный акцент и разная композиция, чтобы лента канала не выглядела одинаковой
const COVERS = [
  { id: '01-what', accent: LIME, kicker: 'что это', title: 'лента образов,<br>где стиль оценивают дрипами', big: null },
  { id: '02-drips', accent: LIME, kicker: 'экономика', title: 'дрипы нельзя купить', big: '200 · 300 · 100' },
  { id: '03-vote', accent: PINK, kicker: 'оценка', title: 'дрипнуть ≠ лайкнуть', big: null },
  { id: '04-rank', accent: VIOLET, kicker: 'рейтинг', title: 'неделя обнуляется<br>в понедельник', big: null },
  { id: '05-post', accent: LIME, kicker: 'как снимать', title: 'зеркало, свет, образ', big: null },
  { id: '06-invite', accent: VIOLET, kicker: 'рефералка', title: 'за друга', big: '+500' },
  { id: '07a-theme-dark', theme: 'dark', kicker: 'тема · тёмная', title: 'графит и белый.<br>лайм только на дрипах', big: null },
  { id: '07b-theme-light', theme: 'light', kicker: 'тема · светлая', title: 'бумага, чёрный текст,<br>ничего лишнего', big: null },
  { id: '07c-theme-neon', theme: 'neon', kicker: 'тема · цветная', title: 'лайм, фиолет<br>и мягкое свечение', big: null },
  { id: '08-cta', accent: LIME, kicker: 'поехали', title: 'выложи первый образ', big: '+300' },
  // обложки апдейтов: id вида uN-...
  { id: 'u1-photos', accent: LIME, kicker: 'обновление', title: 'три фото, два стиля<br>и цены вещей', big: null },
  { id: 'u2-week', accent: VIOLET, kicker: 'обновление', title: 'рейтинг недели.<br>обнуление в понедельник', big: null },
  { id: 'u3-draft', accent: PINK, kicker: 'обновление', title: 'черновик образа<br>больше не теряется', big: null },
  { id: 'u4-icons', accent: LIME, kicker: 'обновление', title: 'свои иконки стилей<br>и плавные переходы', big: null },
  { id: 'u5-firstdrip', accent: LIME, kicker: 'статус', title: 'first drip —<br>первым 50', big: null },
  { id: 'u6-story', accent: VIOLET, kicker: 'истории', title: 'карточка в сторис<br>с твоей ссылкой', big: '+200' },
  { id: 'u7-storycard', accent: LIME, kicker: 'истории', title: 'в сторис уходит<br>твой образ', big: null },
  { id: 'u8-rules', accent: PINK, kicker: 'правила', title: 'жалобы разбираем,<br>откровенное не пройдёт', big: null },
  { id: 'u9-support', accent: LIME, kicker: 'поддержка', title: 'вопрос — прямо<br>из приложения', big: null },
]

function coverHtml(c) {
  const th = THEMES[c.theme] || null
  const bg = th ? th.bg : INK
  const text = th ? th.text : '#F5F5F7'
  const muted = th ? th.muted : '#8A8A96'
  const accent = th ? th.accent : c.accent
  const glow1 = th ? th.glow : c.accent
  const glow2 = th ? th.glow : VIOLET
  const dripDot = th ? th.drip : LIME
  return `${FONTS}<style>
  *{margin:0;box-sizing:border-box}
  body{width:1280px;height:720px;background:${bg};font-family:Onest,sans-serif;color:${text};overflow:hidden}
  .card{position:relative;width:100%;height:100%;padding:72px;display:flex;flex-direction:column;justify-content:space-between}
  .glow{position:absolute;border-radius:50%;filter:blur(120px)}
  .g1{width:560px;height:560px;top:-220px;right:-120px;background:${glow1};opacity:.22}
  .g2{width:420px;height:420px;bottom:-200px;left:-140px;background:${glow2};opacity:.18}
  .kicker{position:relative;font-size:22px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${accent}}
  .mid{position:relative;display:flex;flex-direction:column;gap:18px}
  .big{font-family:Unbounded;font-weight:900;font-size:120px;line-height:1;letter-spacing:-.03em;color:${accent};display:flex;align-items:center;gap:20px}
  h1{font-family:Unbounded;font-weight:700;font-size:${c.big ? 54 : 76}px;line-height:1.08;letter-spacing:-.03em;max-width:15ch;text-wrap:balance}
  .foot{position:relative;display:flex;align-items:flex-end;justify-content:space-between}
  .logo{display:inline-flex;align-items:flex-end;gap:8px;font-family:Unbounded;font-weight:900;font-size:40px;letter-spacing:-.03em}
  .logo i{width:12px;height:12px;margin-bottom:8px;border-radius:50%;background:${dripDot}}
  .handle{font-size:22px;font-weight:600;color:${muted}}
</style>
<div class="card">
  <div class="glow g1"></div><div class="glow g2"></div>
  <div class="kicker">${c.kicker}</div>
  <div class="mid">
    ${c.big ? `<div class="big">${c.big.includes('+') ? coin(96) : ''}${c.big}</div>` : ''}
    <h1>${c.title}</h1>
  </div>
  <div class="foot">
    <span class="logo">driply<i></i></span>
    <span class="handle">@Driplycheckbot</span>
  </div>
</div>`
}

// эмодзи собираются из того же набора иконок, что и приложение: одна форма — везде
const STROKE = [
  ...Object.entries(STYLE_ICONS).map(([id, svg]) => ({ id: `style-${id}`, svg, color: LIME })),
  ...Object.entries(CATEGORY_ICONS).map(([id, svg]) => ({ id: `item-${id}`, svg, color: VIOLET })),
  { id: 'crown', svg: '<path d="M3.4 18.4h17.2M3.4 18.4 2.2 7.6l5.6 3.6L12 4.6l4.2 6.6 5.6-3.6-1.2 10.8"/>', color: LIME },
  { id: 'check', svg: '<path d="m4.6 12.6 4.8 4.8 10-10.8"/>', color: LIME },
  { id: 'up', svg: '<path d="M12 20V4m0 0 6.4 6.4M12 4 5.6 10.4"/>', color: LIME },
  { id: 'arrow', svg: '<path d="M4 12h16m0 0-6.4-6.4M20 12l-6.4 6.4"/>', color: VIOLET },
  { id: 'fire', svg: '<path d="M12 2.6c4.2 5.4 7 8.6 7 12a7 7 0 1 1-14 0c0-3.4 2.8-6.6 7-12z"/><path d="M12 12c1.8 2.8 3 4.2 3 6a3 3 0 1 1-6 0c0-1.8 1.2-3.2 3-6z"/>', color: PINK },
  { id: 'star', svg: '<path d="m12 3 2.7 6.3 6.8.5-5.2 4.4 1.6 6.6L12 17.3 6.1 20.8l1.6-6.6-5.2-4.4 6.8-.5z"/>', color: VIOLET },
]

const strokeHtml = (e) => `<style>*{margin:0}body{width:100px;height:100px;background:transparent}</style>
<svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="${e.color}" stroke-width="1.9"
     stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">${e.svg}</svg>`

// монета — знак валюты, поэтому заливкой, а не штрихом; два варианта на выбор
const coinTile = (bg, fg) => `<rect x="2" y="2" width="96" height="96" rx="28" fill="${bg}"/><text x="40" y="54" font-family="Unbounded" font-weight="900" font-size="58" fill="${fg}" text-anchor="middle" dominant-baseline="central">d</text><circle cx="74" cy="68" r="9" fill="${fg}"/>`

// монета в цветах каждой темы + метка темы: под посты про оформление
const COINS = [
  { id: 'coin-tile', svg: coinTile(LIME, INK) },
  { id: 'coin-dark', svg: coinTile('#F2F2F2', '#0A0A0A') },
  { id: 'coin-light', svg: coinTile('#111111', '#F3F1EC') },
  { id: 'coin-neon', svg: `<rect x="2" y="2" width="96" height="96" rx="28" fill="${LIME}"/><text x="40" y="54" font-family="Unbounded" font-weight="900" font-size="58" fill="${INK}" text-anchor="middle" dominant-baseline="central">d</text><circle cx="74" cy="68" r="9" fill="${VIOLET}"/>` },
  { id: 'theme-dark', svg: `<rect x="8" y="8" width="84" height="84" rx="26" fill="#0A0A0A" stroke="#F2F2F2" stroke-width="5"/><circle cx="50" cy="50" r="13" fill="${LIME}"/>` },
  { id: 'theme-light', svg: `<rect x="8" y="8" width="84" height="84" rx="26" fill="#F3F1EC" stroke="#111111" stroke-width="5"/><circle cx="50" cy="50" r="13" fill="#111111"/>` },
  { id: 'theme-neon', svg: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${VIOLET}"/><stop offset="1" stop-color="${PINK}"/></linearGradient></defs><rect x="8" y="8" width="84" height="84" rx="26" fill="url(#g)"/><circle cx="50" cy="50" r="13" fill="${LIME}"/>` },
]

// цифры Unbounded 900: ими набираются числа экономики прямо в тексте поста
const DIGITS = [...'0123456789'].map((d) => ({ id: `digit-${d}`, char: d, color: LIME }))
  .concat([{ id: 'digit-plus', char: '+', color: LIME }, { id: 'digit-x', char: '×', color: PINK }])

const digitHtml = (d) => `${FONTS}<style>*{margin:0}body{width:100px;height:100px;background:transparent;display:grid;place-items:center}
  span{font-family:Unbounded,sans-serif;font-weight:900;font-size:${d.char === '+' || d.char === '×' ? 76 : 70}px;line-height:1;color:${d.color};letter-spacing:-.04em}</style><span>${d.char}</span>`

const coinHtml = (c) => `${FONTS}<style>*{margin:0}body{width:100px;height:100px;background:transparent}</style>
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${c.svg}</svg>`

const browser = await chromium.launch()

const ctxCover = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
for (const c of COVERS) {
  const page = await ctxCover.newPage()
  await page.setContent(coverHtml(c), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${OUT}covers/${c.id}.png` })
  await page.setViewportSize({ width: 640, height: 360 })
  await page.evaluate(() => { document.body.style.zoom = 0.5 })
  await page.screenshot({ path: `${OUT}covers-preview/${c.id}.png` })
  await page.close()
  console.log('обложка', c.id)
}
await ctxCover.close()

const ctxEmoji = await browser.newContext({ viewport: { width: 100, height: 100 }, deviceScaleFactor: 1 })
for (const e of [
  ...COINS.map((c) => ({ ...c, html: coinHtml(c) })),
  ...DIGITS.map((d) => ({ ...d, html: digitHtml(d) })),
  ...STROKE.map((e) => ({ ...e, html: strokeHtml(e) })),
]) {
  const page = await ctxEmoji.newPage()
  await page.setContent(e.html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${OUT}emoji/${e.id}.png`, omitBackground: true })
  await page.close()
  console.log('эмодзи', e.id)
}
await ctxEmoji.close()
await browser.close()

await writeFile(OUT + 'README.md', `# ТГ-пак Driply

Сгенерировано \`node marketing/make-pack.mjs\`. Тексты и цвета — в этом же файле.

## covers/ — обложки постов, 1280×720
По одной на каждый пост канала. Прикрепляй картинку к посту, текст поста — в подписи.

## emoji/ — кастомные эмодзи, 100×100 с прозрачным фоном
Загрузка: @Stickers → /newemojipack → выбрать «static» → залить файлы → задать каждому
базовый эмодзи (coin → 💧, crown → 👑, fire → 🔥, check → ✅, up → ⬆️, arrow → ➡️,
star → ⭐, dot → 🔸, hanger → 👕). Ставить их в текст может только аккаунт с Premium,
но видят все.
`)
console.log('готово:', OUT)

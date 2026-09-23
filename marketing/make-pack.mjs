// Генератор ТГ-пака: обложки постов (1280×720) и кастомные эмодзи (100×100, прозрачные).
// Запуск: node marketing/make-pack.mjs   (нужен playwright — стоит в web/)
import { chromium } from '../web/node_modules/playwright/index.mjs'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const OUT = fileURLToPath(new URL('./tg-pack/', import.meta.url))
await mkdir(OUT + 'covers', { recursive: true })
await mkdir(OUT + 'emoji', { recursive: true })

const INK = '#09090B', LIME = '#C6FF3D', VIOLET = '#7C5CFF', PINK = '#FF4D8D', SURFACE = '#1C1C22'

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
  { id: '07-themes', accent: PINK, kicker: 'оформление', title: 'три темы:<br>тёмная, светлая, цветная', big: null },
  { id: '08-cta', accent: LIME, kicker: 'поехали', title: 'выложи первый образ', big: '+300' },
]

function coverHtml(c) {
  return `${FONTS}<style>
  *{margin:0;box-sizing:border-box}
  body{width:1280px;height:720px;background:${INK};font-family:Onest,sans-serif;color:#F5F5F7;overflow:hidden}
  .card{position:relative;width:100%;height:100%;padding:72px;display:flex;flex-direction:column;justify-content:space-between}
  .glow{position:absolute;border-radius:50%;filter:blur(120px)}
  .g1{width:560px;height:560px;top:-220px;right:-120px;background:${c.accent};opacity:.22}
  .g2{width:420px;height:420px;bottom:-200px;left:-140px;background:${VIOLET};opacity:.18}
  .kicker{position:relative;font-size:22px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:${c.accent}}
  .mid{position:relative;display:flex;flex-direction:column;gap:18px}
  .big{font-family:Unbounded;font-weight:900;font-size:120px;line-height:1;letter-spacing:-.03em;color:${c.accent};display:flex;align-items:center;gap:20px}
  h1{font-family:Unbounded;font-weight:700;font-size:${c.big ? 54 : 76}px;line-height:1.08;letter-spacing:-.03em;max-width:15ch;text-wrap:balance}
  .foot{position:relative;display:flex;align-items:flex-end;justify-content:space-between}
  .logo{display:inline-flex;align-items:flex-end;gap:8px;font-family:Unbounded;font-weight:900;font-size:40px;letter-spacing:-.03em}
  .logo i{width:12px;height:12px;margin-bottom:8px;border-radius:50%;background:${LIME}}
  .handle{font-size:22px;font-weight:600;color:#8A8A96}
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

// эмодзи: простые плотные фигуры — они должны читаться на 20px в строке текста
const EMOJI = [
  { id: 'coin', svg: `<circle cx="50" cy="50" r="46" fill="${LIME}"/><text x="50" y="52" font-family="Unbounded" font-weight="900" font-size="54" fill="${INK}" text-anchor="middle" dominant-baseline="central">d</text>` },
  { id: 'coin-ink', svg: `<circle cx="50" cy="50" r="46" fill="${INK}" stroke="${LIME}" stroke-width="6"/><text x="50" y="52" font-family="Unbounded" font-weight="900" font-size="52" fill="${LIME}" text-anchor="middle" dominant-baseline="central">d</text>` },
  { id: 'crown', svg: `<path d="M12 74h76l8-44-24 16-22-30-22 30-24-16z" fill="${LIME}"/><rect x="12" y="80" width="76" height="10" rx="5" fill="${LIME}"/>` },
  { id: 'up', svg: `<circle cx="50" cy="50" r="46" fill="${LIME}"/><path d="M50 22 78 54H62v26H38V54H22z" fill="${INK}"/>` },
  { id: 'check', svg: `<circle cx="50" cy="50" r="46" fill="${LIME}"/><path d="M26 52l16 16 32-34" stroke="${INK}" stroke-width="12" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` },
  { id: 'fire', svg: `<path d="M50 6c18 22 30 34 30 50a30 30 0 1 1-60 0C20 40 32 28 50 6z" fill="${PINK}"/><path d="M50 40c8 12 14 18 14 26a14 14 0 1 1-28 0c0-8 6-14 14-26z" fill="${INK}" opacity=".55"/>` },
  { id: 'star', svg: `<path d="M50 8l11 27 29 2-22 19 7 28-25-15-25 15 7-28-22-19 29-2z" fill="${VIOLET}"/>` },
  { id: 'arrow', svg: `<circle cx="50" cy="50" r="46" fill="${VIOLET}"/><path d="M28 50h38M52 32l18 18-18 18" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round" fill="none"/>` },
  { id: 'dot', svg: `<circle cx="50" cy="50" r="26" fill="${LIME}"/>` },
  { id: 'hanger', svg: `<circle cx="50" cy="22" r="12" fill="none" stroke="${LIME}" stroke-width="8"/><path d="M50 34v10L14 74h72L50 44" fill="none" stroke="${LIME}" stroke-width="8" stroke-linejoin="round"/>` },
]

const emojiHtml = (e) => `${FONTS}<style>*{margin:0}body{width:100px;height:100px;background:transparent}</style>
<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">${e.svg}</svg>`

const browser = await chromium.launch()

const ctxCover = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
for (const c of COVERS) {
  const page = await ctxCover.newPage()
  await page.setContent(coverHtml(c), { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: `${OUT}covers/${c.id}.png` })
  await page.close()
  console.log('обложка', c.id)
}
await ctxCover.close()

const ctxEmoji = await browser.newContext({ viewport: { width: 100, height: 100 }, deviceScaleFactor: 1 })
for (const e of EMOJI) {
  const page = await ctxEmoji.newPage()
  await page.setContent(emojiHtml(e), { waitUntil: 'networkidle' })
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

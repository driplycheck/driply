// Превращает HTML-страницу в картинку для поста. Нужен PR-менеджеру: он рисует
// обложку под конкретный пост, а не берёт готовый шаблон, поэтому каждая своя.
//
//   node marketing/make-cover.mjs cover.html out.png            # 1080×1350 (4:5)
//   node marketing/make-cover.mjs cover.html out.png 1080 1080  # свой размер
//
// Шрифты Unbounded и Onest подключаются внутри HTML через Google Fonts.
import { chromium } from '../web/node_modules/playwright/index.mjs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const [src, out, w, h] = process.argv.slice(2)
if (!src || !out) {
  console.error('Как звать: node marketing/make-cover.mjs <файл.html> <файл.png> [ширина] [высота]')
  process.exit(1)
}

const width = Number(w) || 1080
const height = Number(h) || 1350
const html = await readFile(resolve(src), 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
await page.setContent(html, { waitUntil: 'networkidle' })
// шрифтам нужно время: без этого надпись рендерится системным и всё разваливается
await page.evaluate(() => document.fonts.ready)
await page.waitForTimeout(300)
await page.screenshot({ path: resolve(out) })
await browser.close()
console.log(`обложка готова: ${out} (${width}×${height})`)

// Создаёт кастомный эмодзи-пак Driply через Bot API. Владельцем становится указанный аккаунт.
//
//   BOT_TOKEN=... node marketing/upload-emoji-pack.mjs --user 957954261
//   node marketing/upload-emoji-pack.mjs --user 957954261 --dry     # только показать план
//
// Токен берётся из переменной окружения BOT_TOKEN или из bot/.env. Никуда не сохраняется.
// Условия Telegram: аккаунт-владелец должен был хотя бы раз написать боту.
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const DIR = fileURLToPath(new URL('./tg-pack/emoji/', import.meta.url))
const args = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
const DRY = args.includes('--dry')
const USER_ID = Number(flag('user') || process.env.TG_USER_ID || 0)
const TITLE = flag('title', 'Driply')

// базовый эмодзи обязателен для каждого кастомного: по нему работает поиск и фолбэк без Premium
const EMOJI = {
  'coin-tile': '💧', crown: '👑', check: '✅', up: '⬆️', arrow: '➡️', fire: '🔥', star: '⭐',
  // монеты и метки под темы оформления
  'coin-dark': '💧', 'coin-light': '💧', 'coin-neon': '💧',
  'theme-dark': '⬛', 'theme-light': '⬜', 'theme-neon': '🟣',
  'item-top': '👕', 'item-bottoms': '👖', 'item-shoes': '👟', 'item-accessory': '🧢',
  'item-dress': '👗', 'item-skirt': '👚', 'item-bag': '👜', 'item-other': '✨',
  'style-streetwear': '🛹', 'style-casual': '👕', 'style-y2k': '💿', 'style-alt': '🖤',
  'style-oldmoney': '💎', 'style-minimal': '◽', 'style-grunge': '🎸', 'style-techwear': '📡',
  'style-gorpcore': '🏔', 'style-vintage': '📻', 'style-preppy': '🎓', 'style-sporty': '🏋',
  'style-formal': '👔', 'style-boho': '🪶', 'style-cottagecore': '🌸', 'style-punk': '⚡',
}

// порядок в паке: монета, стили, вещи, остальное
const ORDER = (id) => (id.startsWith('coin-') ? 0 : id.startsWith('theme-') ? 1 : id.startsWith('style-') ? 2 : id.startsWith('item-') ? 3 : 4)

async function readToken() {
  if (process.env.BOT_TOKEN) return process.env.BOT_TOKEN.trim()
  try {
    const env = await readFile(fileURLToPath(new URL('../bot/.env', import.meta.url)), 'utf8')
    const line = env.split('\n').find((l) => l.startsWith('BOT_TOKEN='))
    if (line) return line.slice('BOT_TOKEN='.length).trim()
  } catch {}
  return null
}

async function api(token, method, body, isForm = false) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    ...(isForm ? { body } : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  })
  const json = await res.json()
  if (!json.ok) throw new Error(`${method}: ${json.description}`)
  return json.result
}

const files = (await readdir(DIR))
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.replace('.png', ''))
  .sort((a, b) => ORDER(a) - ORDER(b) || a.localeCompare(b))

const missing = files.filter((id) => !EMOJI[id])
if (missing.length) {
  console.error('Нет базового эмодзи для:', missing.join(', '), '— допиши в EMOJI и запусти снова')
  process.exit(1)
}

console.log(`Файлов: ${files.length}`)
console.log(files.map((id) => `  ${EMOJI[id]}  ${id}`).join('\n'))

if (!USER_ID) {
  console.error('\nНужен --user <telegram_id> владельца пака')
  process.exit(1)
}

const token = await readToken()
if (!token && !DRY) {
  console.error('\nНет BOT_TOKEN: передай переменной окружения или положи в bot/.env')
  process.exit(1)
}

if (DRY) {
  console.log('\n--dry: запросы не отправлялись')
  process.exit(0)
}

const me = await api(token, 'getMe', {})
const name = flag('name', `driply_by_${me.username}`) // Telegram требует суффикс _by_<бот>
console.log(`\nБот @${me.username}, короткое имя пака: ${name}`)

// 1. заливаем файлы, получаем file_id
const uploaded = []
for (const id of files) {
  const form = new FormData()
  form.append('user_id', String(USER_ID))
  form.append('sticker_format', 'static')
  form.append('sticker', new Blob([await readFile(DIR + id + '.png')], { type: 'image/png' }), `${id}.png`)
  const file = await api(token, 'uploadStickerFile', form, true)
  uploaded.push({ id, file_id: file.file_id })
  console.log('залито', id)
}

const stickers = uploaded.map((u) => ({
  sticker: u.file_id,
  format: 'static',          // Bot API 7.2+
  emoji_list: [EMOJI[u.id]],
}))

// 2. создаём пак; если он уже есть — дозаливаем в него недостающее
try {
  await api(token, 'createNewStickerSet', {
    user_id: USER_ID,
    name,
    title: TITLE,
    sticker_type: 'custom_emoji',
    sticker_format: 'static',  // для старых версий Bot API
    stickers,
  })
  console.log('\nПак создан')
} catch (e) {
  if (!String(e.message).includes('STICKERSET_INVALID') && !String(e.message).includes('occupied')) throw e
  console.log('\nПак уже существует, добавляю в него:', e.message)
  for (const sticker of stickers) {
    await api(token, 'addStickerToSet', { user_id: USER_ID, name, sticker })
  }
}

console.log(`Ссылка: https://t.me/addemoji/${name}`)

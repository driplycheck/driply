// Создаёт кастомный эмодзи-пак Driply через Bot API. Владельцем становится указанный аккаунт.
//
//   BOT_TOKEN=... node marketing/upload-emoji-pack.mjs --user 957954261          # создать или дополнить
//   BOT_TOKEN=... node marketing/upload-emoji-pack.mjs --info                     # что сейчас в паке
//   BOT_TOKEN=... node marketing/upload-emoji-pack.mjs --user ... --only digit-   # залить только часть
//   node marketing/upload-emoji-pack.mjs --user 957954261 --dry                   # показать план
//
// Токен берётся из переменной окружения BOT_TOKEN или из bot/.env. Никуда не сохраняется.
// Условия Telegram: аккаунт-владелец должен был хотя бы раз написать боту.
import { readdir, readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const DIR = fileURLToPath(new URL('./tg-pack/emoji/', import.meta.url))
const args = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : fallback
}
const DRY = args.includes('--dry')
const INFO = args.includes('--info')
const TEST = args.includes('--test')   // бот пришлёт сообщение, набранное кастомными эмодзи
const ONLY = flag('only')            // подстрока в имени файла: digit-, style-, item-
const MANIFEST = fileURLToPath(new URL('./tg-pack/.uploaded.json', import.meta.url))
const USER_ID = Number(flag('user') || process.env.TG_USER_ID || 0)
const TITLE = flag('title', 'Driply')

// базовый эмодзи обязателен для каждого кастомного: по нему работает поиск и фолбэк без Premium
const EMOJI = {
  'coin-tile': '💧', crown: '👑', check: '✅', up: '⬆️', arrow: '➡️', fire: '🔥', star: '⭐',
  // монеты и метки под темы оформления
  'coin-dark': '💧', 'coin-light': '💧', 'coin-neon': '💧',
  'theme-dark': '⬛', 'theme-light': '⬜', 'theme-neon': '🟣',
  // цифры для чисел экономики
  'digit-0': '0️⃣', 'digit-1': '1️⃣', 'digit-2': '2️⃣', 'digit-3': '3️⃣', 'digit-4': '4️⃣',
  'digit-5': '5️⃣', 'digit-6': '6️⃣', 'digit-7': '7️⃣', 'digit-8': '8️⃣', 'digit-9': '9️⃣',
  'digit-plus': '➕', 'digit-x': '✖️',
  'item-top': '👕', 'item-bottoms': '👖', 'item-shoes': '👟', 'item-accessory': '🧢',
  'item-dress': '👗', 'item-skirt': '👚', 'item-bag': '👜', 'item-other': '✨',
  'style-streetwear': '🛹', 'style-casual': '👕', 'style-y2k': '💿', 'style-alt': '🖤',
  'style-oldmoney': '💎', 'style-minimal': '◽', 'style-grunge': '🎸', 'style-techwear': '📡',
  'style-gorpcore': '🏔', 'style-vintage': '📻', 'style-preppy': '🎓', 'style-sporty': '🏋',
  'style-formal': '👔', 'style-boho': '🪶', 'style-cottagecore': '🌸', 'style-punk': '⚡',
}

// порядок в паке: монета, стили, вещи, остальное
const ORDER = (id) => (id.startsWith('coin-') ? 0 : id.startsWith('theme-') ? 1 : id.startsWith('digit-') ? 2 : id.startsWith('style-') ? 3 : id.startsWith('item-') ? 4 : 5)

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

const all = (await readdir(DIR))
  .filter((f) => f.endsWith('.png'))
  .map((f) => f.replace('.png', ''))
  .sort((a, b) => ORDER(a) - ORDER(b) || a.localeCompare(b))

// что уже заливали: манифест пишется после успешной загрузки
let uploadedBefore = []
try { uploadedBefore = JSON.parse(await readFile(MANIFEST, 'utf8')).ids ?? [] } catch {}

const missing = all.filter((id) => !EMOJI[id])
if (missing.length) {
  console.error('Нет базового эмодзи для:', missing.join(', '), '— допиши в EMOJI и запусти снова')
  process.exit(1)
}

const token = await readToken()
if (!token && !DRY) {
  console.error('Нет BOT_TOKEN: передай переменной окружения или положи в bot/.env')
  process.exit(1)
}

// --- что уже лежит в паке ---
let existing = null
let name = flag('name')
if (token) {
  const me = await api(token, 'getMe', {})
  name = name || `driply_by_${me.username}` // Telegram требует суффикс _by_<бот>
  try {
    existing = await api(token, 'getStickerSet', { name })
  } catch {
    existing = null
  }
  console.log(`Бот @${me.username}, пак: ${name}`)
  if (existing) {
    const counts = {}
    for (const st of existing.stickers) counts[st.emoji] = (counts[st.emoji] ?? 0) + 1
    console.log(`В паке сейчас: ${existing.stickers.length} шт. — ${Object.entries(counts).map(([e, n]) => e + (n > 1 ? '×' + n : '')).join(' ')}`)
  } else {
    console.log('Пака с таким именем нет — будет создан новый')
  }
}

// Проверка «пак реально работает»: собираем сообщение с сущностями custom_emoji.
// Так видно и то, что эмодзи на месте, и то, как они выглядят в ленте сообщений.
if (TEST) {
  if (!existing) { console.error('Пака нет — сначала залей'); process.exit(1) }
  if (!USER_ID) { console.error('Нужен --user <telegram_id>, кому слать'); process.exit(1) }
  const byEmoji = {}
  for (const st of existing.stickers) byEmoji[st.emoji] ??= st.custom_emoji_id
  const parts = ['2️⃣', '0️⃣', '0️⃣', ' ', '💧', ' — ', '👑', ' ', '🛹', ' ', '👕']
  let text = ''
  const entities = []
  for (const part of parts) {
    const id = byEmoji[part]
    if (id) entities.push({ type: 'custom_emoji', offset: text.length, length: part.length, custom_emoji_id: id })
    text += part
  }
  await api(token, 'sendMessage', { chat_id: USER_ID, text, entities })
  console.log(`Отправил тестовое сообщение: ${text}`)
  console.log(`Кастомных эмодзи в нём: ${entities.length} из ${parts.filter((x) => x.trim()).length}`)
  process.exit(0)
}

if (INFO) {
  if (existing) {
    const inPack = new Set(existing.stickers.map((st) => st.emoji))
    const absent = all.filter((id) => !inPack.has(EMOJI[id]))
    console.log(absent.length ? `Не хватает: ${absent.join(', ')}` : 'Всё на месте')
  }
  process.exit(0)
}

// --- что заливать ---
const inPack = existing ? new Set(existing.stickers.map((st) => st.emoji)) : new Set()
const files = ONLY
  ? all.filter((id) => id.includes(ONLY))
  : existing
    ? all.filter((id) => !uploadedBefore.includes(id) && !inPack.has(EMOJI[id]))
    : all

console.log(`\nК загрузке: ${files.length}`)
console.log(files.map((id) => `  ${EMOJI[id]}  ${id}`).join('\n'))

if (DRY) {
  console.log('\n--dry: запросы не отправлялись')
  process.exit(0)
}
if (files.length === 0) {
  console.log('Нечего добавлять. Чтобы залить что-то конкретное: --only digit-')
  process.exit(0)
}
if (!USER_ID) {
  console.error('\nНужен --user <telegram_id> владельца пака')
  process.exit(1)
}

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

// 2. пак есть — дозаливаем, нет — создаём
if (existing) {
  for (const sticker of stickers) {
    await api(token, 'addStickerToSet', { user_id: USER_ID, name, sticker })
    console.log('добавлено в пак', sticker.emoji_list[0])
  }
  console.log('\nПак дополнен')
} else {
  await api(token, 'createNewStickerSet', {
    user_id: USER_ID,
    name,
    title: TITLE,
    sticker_type: 'custom_emoji',
    sticker_format: 'static',  // для старых версий Bot API
    stickers,
  })
  console.log('\nПак создан')
}

// манифест: в следующий раз зальём только новое
const done = [...new Set([...uploadedBefore, ...files])]
await writeFile(MANIFEST, JSON.stringify({ name, ids: done }, null, 2))

console.log(`Ссылка: https://t.me/addemoji/${name}`)

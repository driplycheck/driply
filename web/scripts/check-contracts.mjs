// Две проверки, которые уже спасали бы нас от молчаливых поломок. Гоняются перед каждой сборкой.
//
//   1. Edge-функции не должны трогать таблицы напрямую: у service_role нет прав на таблицы,
//      всё пишется через security definer RPC. Прямой .from() падает с permission denied,
//      а наружу это выглядит как невнятная 400 — так поддержка молча не работала целый день.
//
//   2. Каждый код ошибки из базы должен иметь текст для человека. Иначе пользователь
//      получает «что-то пошло не так» там, где мы точно знаем причину.
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('../../', import.meta.url))
const problems = []

// --- 1. прямые обращения к таблицам в edge-функциях ---
const FUNCTIONS_DIR = ROOT + 'supabase/functions/'
const STORAGE_BUCKETS = ['outfits']   // Storage живёт по своим правилам, ему .from() можно

for (const dir of await readdir(FUNCTIONS_DIR, { withFileTypes: true })) {
  if (!dir.isDirectory()) continue
  const path = `${FUNCTIONS_DIR}${dir.name}/index.ts`
  let source
  try { source = await readFile(path, 'utf8') } catch { continue }

  source.split('\n').forEach((line, i) => {
    const hit = line.match(/\.from\('([a-z_]+)'\)/)
    if (!hit) return
    if (line.includes('.storage') || STORAGE_BUCKETS.includes(hit[1])) return
    problems.push(`${dir.name}/index.ts:${i + 1} — прямое обращение к таблице «${hit[1]}». Нужен RPC: у service_role нет прав на таблицы.`)
  })
}

// --- 2. коды ошибок из базы против словаря в приложении ---
// Функции, созданные до перехода на миграции, в файлах не видны — держим их списком.
const LEGACY_CODES = [
  'ALREADY_VOTED', 'CANNOT_BLOCK_SELF', 'CANNOT_FOLLOW_SELF', 'CANNOT_VOTE_OWN',
  'INVALID_AMOUNT', 'NOT_ENOUGH_CREDITS', 'NOT_OWNER', 'NO_USER', 'POST_NOT_FOUND',
]
const SERVER_ONLY = ['NO_DIGEST_SECRET']  // до человека не доходит, живёт между функциями

const migrations = await readdir(ROOT + 'supabase/migrations')
const fromMigrations = new Set()
for (const file of migrations.filter((f) => f.endsWith('.sql'))) {
  const sql = await readFile(ROOT + 'supabase/migrations/' + file, 'utf8')
  for (const m of sql.matchAll(/raise exception '([A-Z_0-9]+)'/g)) fromMigrations.add(m[1])
}

const api = await readFile(ROOT + 'web/src/api.js', 'utf8')
const mapped = new Map()
const block = api.match(/const ERROR_KEYS = \{([\s\S]*?)\n\}/)
if (!block) problems.push('web/src/api.js — не нашёл ERROR_KEYS, проверка кодов ошибок не работает')
else for (const m of block[1].matchAll(/([A-Z_0-9]+):\s*'([a-z_0-9]+)'/g)) mapped.set(m[1], m[2])

const i18n = await readFile(ROOT + 'web/src/i18n.js', 'utf8')
const allCodes = new Set([...fromMigrations, ...LEGACY_CODES])

for (const code of [...allCodes].sort()) {
  if (SERVER_ONLY.includes(code)) continue
  const key = mapped.get(code)
  if (!key) {
    problems.push(`Код «${code}» приходит из базы, но текста для человека нет — добавь в ERROR_KEYS в web/src/api.js`)
    continue
  }
  // ключ должен быть в обоих языках: регулярка ловит объявление вида  key: '…'
  const uses = [...i18n.matchAll(new RegExp(`\\b${key}:\\s*'`, 'g'))].length
  if (uses < 2) problems.push(`Строка «${key}» (код ${code}) есть не во всех языках в web/src/i18n.js`)
}

if (problems.length) {
  console.error('\n❌ Проверка контрактов не прошла:\n')
  for (const p of problems) console.error('  • ' + p)
  console.error('')
  process.exit(1)
}
console.log(`✅ Контракты в порядке: edge-функции ходят только через RPC, ${allCodes.size - SERVER_ONLY.length} кодов ошибок переведены.`)

// Сверяет живую базу с тем, что лежит в репозитории.
//
// Зачем: журнал миграций в проде и файлы в supabase/ — это два независимых списка.
// Что-то применяют руками, что-то через миграцию, и расхождение никак не проявляется,
// пока базу не придётся поднимать заново. Так четыре функции — в том числе вся
// статистика и модерация — прожили в проде, не существуя в репозитории.
//
//   node scripts/check-schema.mjs
//
// Нужны TG_WEBHOOK_URL и CI_SECRET. Без них скрипт не падает, а честно говорит,
// что сверить не с чем: он не должен блокировать работу без доступа к проду.
import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const HOOK = process.env.TG_WEBHOOK_URL
const SECRET = process.env.CI_SECRET
const SQL_DIR = fileURLToPath(new URL('../../supabase/migrations/', import.meta.url))
const SCHEMA = fileURLToPath(new URL('../../supabase/schema.sql', import.meta.url))

// Функции самой Supabase, не наши: их нет и не должно быть в репозитории.
const PLATFORM = new Set(['rls_auto_enable'])

if (!HOOK || !SECRET) {
  console.log('⏭  Сверка со схемой пропущена: нет TG_WEBHOOK_URL или CI_SECRET.')
  process.exit(0)
}

async function repoSql() {
  const names = await readdir(SQL_DIR)
  const parts = await Promise.all(
    names.filter((n) => n.endsWith('.sql')).map((n) => readFile(SQL_DIR + n, 'utf8')),
  )
  const schema = await readFile(SCHEMA, 'utf8').catch(() => '')
  return [...parts, schema].join('\n')
}

function namesIn(sql, re) {
  const found = new Set()
  for (const m of sql.matchAll(re)) found.add(m[1].toLowerCase())
  return found
}

const res = await fetch(`${HOOK}?schema=${encodeURIComponent(SECRET)}`)
if (!res.ok) {
  console.error(`❌ Прод не ответил (${res.status}). Сверить схему не удалось.`)
  process.exit(1)
}
const live = await res.json()
const sql = await repoSql()

const inRepoFns = namesIn(sql, /create\s+(?:or\s+replace\s+)?function\s+(?:public\.)?([a-z_0-9]+)/gi)
const inRepoTables = namesIn(sql, /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?([a-z_0-9]+)/gi)

const missingFns = (live.functions ?? []).filter((f) => !PLATFORM.has(f) && !inRepoFns.has(f))
const missingTables = (live.tables ?? []).filter((t) => !inRepoTables.has(t))
const noRls = live.tables_without_rls ?? []

let bad = false
if (missingFns.length) {
  bad = true
  console.error(`❌ В проде есть, в репозитории нет — функции (${missingFns.length}):`)
  for (const f of missingFns) console.error(`   · ${f}`)
  console.error('   Подними их миграцией, иначе база не поднимется с нуля.')
}
if (missingTables.length) {
  bad = true
  console.error(`❌ В проде есть, в репозитории нет — таблицы (${missingTables.length}):`)
  for (const t of missingTables) console.error(`   · ${t}`)
}
if (noRls.length) {
  bad = true
  console.error(`❌ Таблицы без защиты на уровне строк (${noRls.length}): ${noRls.join(', ')}`)
}

if (bad) process.exit(1)
console.log(`✅ База и репозиторий сходятся: ${(live.functions ?? []).length} функций, ${(live.tables ?? []).length} таблиц, RLS везде.`)

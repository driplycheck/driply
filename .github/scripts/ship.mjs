// Довести правку до прода — то же, что делает человек локально через driply_push.sh,
// только внутри прогона агента и с автоматическим откатом.
//
//   node .github/scripts/ship.mjs "что починил"
//
// Порядок ровно такой, потому что каждый шаг страхует следующий:
//   1. контракты      — edge-функции не лезут в таблицы, коды ошибок переведены
//   2. сборка         — блокирующая: не собралось, значит в прод не поедет
//   3. линтер         — не блокирует, но показывается
//   4. коммит и пуш в main
//   5. ждём Vercel    — пока не Ready, проверять нечего: в Telegram ещё старая версия
//   6. проверка прода — настоящий браузер по живому адресу
//   7. если проверка упала — откатываем свой же коммит и говорим об этом прямо
//
// Агент не должен сам решать, пускать правку или нет: решают ворота.
import { execFileSync } from 'node:child_process'
import { existsSync, statSync } from 'node:fs'

const MSG = process.argv.slice(2).join(' ').trim()
const REPO = process.env.GITHUB_REPOSITORY || 'driplycheck/driply'
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN
const WEB = 'web'

if (!MSG) {
  console.error('Нужно сообщение коммита: node .github/scripts/ship.mjs "что починил"')
  process.exit(1)
}

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: 'pipe', ...opts })

function loud(cmd, args, opts = {}) {
  try {
    const out = run(cmd, args, opts)
    if (out?.trim()) console.log(out.trim())
    return { ok: true, out }
  } catch (e) {
    const text = `${e.stdout ?? ''}\n${e.stderr ?? ''}`.trim()
    return { ok: false, out: text }
  }
}

const git = (...args) => run('git', args).trim()

// --- есть ли что отправлять ---
if (!git('status', '--porcelain')) {
  console.log('НЕЧЕГО_ОТПРАВЛЯТЬ: рабочее дерево чистое, правок нет.')
  process.exit(0)
}
console.log('Изменено:\n' + git('status', '--short'))

// Страховка от случайного тяжёлого файла: снимок экрана, видео, дамп. Такое в репозиторий
// не кладут, а .gitignore ловит только известные места. Агент работает без присмотра,
// поэтому дешевле остановиться и спросить, чем потом чистить историю.
// Имена читаем через -z: иначе git экранирует кириллицу восьмеричными кодами,
// файл по такому имени не находится, и проверка молча пропускает всё подряд.
const BIG = 2 * 1024 * 1024
const heavy = run('git', ['status', '--porcelain', '-z'])
  .split('\0')
  .filter((e) => e.length > 3 && e[2] === ' ')   // записи переименования идут отдельной строкой без статуса
  .map((e) => e.slice(3))
  .filter((f) => { try { return statSync(f).size > BIG } catch { return false } })
if (heavy.length) {
  console.error(`❌ ОСТАНОВЛЕНО: в правку попали тяжёлые файлы, в репозиторий им нельзя:\n  ${heavy.join('\n  ')}`)
  console.error('Убери их и отправь ещё раз. В прод ничего не ушло.')
  process.exit(1)
}

// --- 1. контракты ---
console.log('\n▶ Контракты…')
const checks = loud('npm', ['run', 'check'], { cwd: WEB })
if (!checks.ok) {
  console.error(checks.out)
  console.error('\n❌ ОСТАНОВЛЕНО: контракты не прошли. В прод ничего не ушло.')
  process.exit(1)
}

// --- 2. сборка: блокирующая ---
console.log('\n▶ Сборка…')
const build = loud('npm', ['run', 'build'], { cwd: WEB })
if (!build.ok) {
  console.error(build.out.slice(-3000))
  console.error('\n❌ ОСТАНОВЛЕНО: сборка упала. В прод ничего не ушло, прод не тронут.')
  process.exit(1)
}
console.log('✅ Сборка прошла.')

// --- 3. линтер: не блокирует ---
const lint = loud('npx', ['eslint', 'src'], { cwd: WEB })
console.log(lint.ok ? '✅ Линтер чист.' : '⚠️ Линтер нашёл замечания (push не блокируется).')

// --- 4. коммит и пуш ---
const before = git('rev-parse', 'HEAD')
run('git', ['config', 'user.name', 'driply-dev-agent'])
run('git', ['config', 'user.email', 'noreply@anthropic.com'])
run('git', ['add', '-A'])
run('git', ['commit', '-m', `${MSG}\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>`])

// кто-то мог запушить, пока агент работал — подбираем чужие коммиты, свой кладём сверху
const pull = loud('git', ['pull', '--rebase', 'origin', 'main'])
if (!pull.ok) {
  loud('git', ['rebase', '--abort'])
  run('git', ['reset', '--hard', before])
  console.error('❌ ОСТАНОВЛЕНО: main ушёл вперёд и правка с ним не сошлась. Ничего не отправлено.')
  process.exit(1)
}

const push = loud('git', ['push', 'origin', 'HEAD:main'])
if (!push.ok) {
  console.error(push.out)
  run('git', ['reset', '--hard', before])
  console.error('❌ ОСТАНОВЛЕНО: пуш не прошёл. Ничего не отправлено.')
  process.exit(1)
}
const sha = git('rev-parse', 'HEAD')
console.log(`\n🚀 Отправлено в main: ${sha.slice(0, 7)} — ${MSG}`)

// --- 5. ждём Vercel ---
async function vercelState() {
  if (!TOKEN) return 'нет токена'
  const res = await fetch(`https://api.github.com/repos/${REPO}/commits/${sha}/status`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'driply-ship' },
  })
  if (!res.ok) return 'нет ответа'
  const json = await res.json()
  const v = (json.statuses ?? []).find((s) => s.context === 'Vercel')
  return v?.state ?? 'ещё нет'
}

let state = 'нет токена'
if (!TOKEN) {
  // в прогоне токен есть всегда; это запасной путь для запуска руками
  console.log('▶ Статус Vercel не спросить (нет токена) — жду 45 секунд вслепую…')
  await new Promise((r) => setTimeout(r, 45000))
} else {
  console.log('▶ Жду деплой Vercel…')
  for (let i = 0; i < 60; i++) {
    state = await vercelState()
    if (state === 'success' || state === 'failure' || state === 'error') break
    await new Promise((r) => setTimeout(r, 5000))
  }
}

async function rollback(why) {
  console.error(`\n❌ ${why}`)
  const rev = loud('git', ['revert', '--no-edit', sha])
  if (!rev.ok) {
    console.error('И откатить не вышло — нужен человек. Прогон: смотри Actions.')
    console.error(rev.out)
    return false
  }
  const back = loud('git', ['push', 'origin', 'HEAD:main'])
  console.error(back.ok
    ? '↩️ Правка откачена, в проде снова предыдущая версия.'
    : '↩️ Откат сделан локально, но запушить не вышло — нужен человек.')
  return back.ok
}

if (TOKEN && state !== 'success') {
  await rollback(`Vercel не собрал прод (${state}).`)
  process.exit(1)
}
console.log(TOKEN ? '✅ Vercel: Ready.' : 'Состояние деплоя не подтверждено.')

// --- 6. проверка прода ---
if (!existsSync(`${WEB}/scripts/smoke.mjs`)) {
  console.log('Проверки прода нет в репозитории — пропускаю.')
  process.exit(0)
}
console.log('\n▶ Проверка прода…')
const smoke = loud('node', ['scripts/smoke.mjs'], { cwd: WEB })
console.log(smoke.out.slice(-2500))
if (!smoke.ok) {
  const done = await rollback('Прод после правки не прошёл проверку.')
  console.error(done
    ? 'Скажи человеку: правка ломала прод, её откатили, причина выше.'
    : 'Скажи человеку: правка ломала прод, откат не удался — нужен он сам.')
  process.exit(1)
}

console.log('\n✅ ГОТОВО: правка в проде и проверена.')

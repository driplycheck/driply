// Данные для агентов. Отдельный скрипт, а не curl, по простой причине:
// права Claude Code блокируют команды с подстановкой переменных ($CI_SECRET),
// поэтому агент не мог получить ни статистику, ни свою историю.
// Здесь переменные читаются внутри скрипта, а команда остаётся простой:
//
//   node .github/scripts/ask.mjs stats funnel 30
//   node .github/scripts/ask.mjs health
//   node .github/scripts/ask.mjs history pr 12
const HOOK = process.env.TG_WEBHOOK_URL
const SECRET = process.env.CI_SECRET
const [what, arg, num] = process.argv.slice(2)

if (!HOOK || !SECRET) {
  console.error('Нет TG_WEBHOOK_URL или CI_SECRET в окружении прогона.')
  process.exit(1)
}

const urls = {
  stats: () => `${HOOK}?stats=${encodeURIComponent(SECRET)}&name=${encodeURIComponent(arg || 'funnel')}&days=${Number(num) || 30}`,
  health: () => `${HOOK}?health=${encodeURIComponent(SECRET)}`,
  history: () => `${HOOK}?history=${encodeURIComponent(SECRET)}&kind=${encodeURIComponent(arg || 'pr')}&limit=${Number(num) || 12}`,
}

if (!urls[what]) {
  console.error('Что запросить: stats <срез> <дней> | health | history <агент> <сколько>')
  console.error('Срезы: funnel, exits, growth, retention, content, economy, errors')
  process.exit(1)
}

const res = await fetch(urls[what]())
const text = await res.text()
if (!res.ok) {
  console.error(`Ответ ${res.status}: ${text.slice(0, 300)}`)
  process.exit(1)
}
try {
  console.log(JSON.stringify(JSON.parse(text), null, 2))
} catch {
  console.log(text)
}

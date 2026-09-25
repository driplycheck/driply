// Достаёт из лога выполнения последний текст агента и отправляет его в его тему в Telegram.
import { readFile } from 'node:fs/promises'

const file = process.env.EXEC_FILE
const hook = process.env.HOOK
const secret = process.env.CI_SECRET
const thread = process.env.THREAD_ID
const kind = process.env.KIND || 'агент'

function textFrom(log) {
  // формат лога — поток сообщений; берём последний ответ ассистента
  const entries = Array.isArray(log) ? log : (log.messages ?? log.result ?? [])
  const texts = []
  for (const entry of entries) {
    const content = entry?.message?.content ?? entry?.content
    if (typeof content === 'string') texts.push(content)
    else if (Array.isArray(content)) {
      for (const block of content) if (block?.type === 'text' && block.text) texts.push(block.text)
    }
  }
  return texts.length ? texts[texts.length - 1] : ''
}

let text = ''
try {
  text = textFrom(JSON.parse(await readFile(file, 'utf8')))
} catch {
  text = ''
}
// молчание — худший исход: если ответа нет, объясняем почему и куда смотреть
if (!text.trim()) {
  const status = process.env.JOB_STATUS || 'unknown'
  text = status === 'success'
    ? 'Отработал, но ответа не оставил. Прогон: ' + (process.env.RUN_URL || '—')
    : `Не справился (${status}). Прогон: ${process.env.RUN_URL || '—'}`
}

const res = await fetch(`${hook}?report=${encodeURIComponent(secret)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: text.slice(0, 3500), thread_id: thread ? Number(thread) : null, kind }),
})
const json = await res.json().catch(() => ({}))
console.log(json.ok ? `Ответ ${kind} отправлен.` : `Не отправил: ${json.error ?? res.status}`)

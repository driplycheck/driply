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

// Telegram понимает только простые теги. Разметку, которую агент всё-таки написал,
// вычищаем здесь: правило в роли — просьба, а это гарантия.
function forTelegram(raw) {
  let out = String(raw)
  out = out.replace(/```[a-z]*\n?/gi, '')            // блоки кода
  out = out.replace(/`([^`]+)`/g, '$1')               // одиночные кавычки-код
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, '')        // заголовки
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')  // жирный markdown → тег
  out = out.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!?:;]|$)/g, '$1$2') // курсив-звёздочки
  out = out.replace(/^\s*[-*]\s+/gm, '— ')            // маркеры списка
  // всё, что похоже на чужой тег, кроме разрешённых, показываем как текст
  out = out.replace(/<(?!\/?(b|i|u|s|code|pre|a\s)[^>]*>)([^>]*)>/gi, '&lt;$2&gt;')
  out = out.replace(/\n{3,}/g, '\n\n').trim()
  return out
}

// Обложка, если PR-менеджер её нарисовал: marketing/out/cover.png
let photo = null
try {
  const buf = await readFile('marketing/out/cover.png')
  if (buf.length < 4_000_000) photo = buf.toString('base64')
  console.log(`обложка найдена: ${Math.round(buf.length / 1024)} КБ`)
} catch { /* обложки нет — отправим просто текст */ }

const res = await fetch(`${hook}?report=${encodeURIComponent(secret)}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: forTelegram(text).slice(0, 3500), thread_id: thread ? Number(thread) : null, kind, photo }),
})
const json = await res.json().catch(() => ({}))
console.log(json.ok ? `Ответ ${kind} отправлен.` : `Не отправил: ${json.error ?? res.status}`)

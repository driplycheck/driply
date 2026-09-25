import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

// Воронка: события пишет edge function под service_role. Молча, без задержек для UI.
export function track(kind, meta = {}) {
  const initData = getInitData()
  if (!initData) return
  supabase.functions
    .invoke('quick-handler', { body: { action: 'track', initData, kind, meta } })
    .catch(() => {})
}

// Ошибки у живых людей: без этого о поломке узнаёшь, только если кто-то напишет в поддержку.
// Шлём кратко и не больше пяти штук за сеанс — иначе один цикл ошибок зальёт всю таблицу.
const seen = new Set()
let sent = 0

export function watchErrors() {
  const report = (kind, message, extra = {}) => {
    const text = String(message || '').slice(0, 200)
    if (!text || seen.has(text) || sent >= 5) return
    seen.add(text)
    sent += 1
    track(kind, { message: text, ...extra, path: location.hash || '/' })
  }

  window.addEventListener('error', (e) => {
    if (e.target && e.target !== window && e.target.tagName) {
      // не докричались до картинки или скрипта — это тоже поломка, но другого рода
      return report('res_error', e.target.currentSrc || e.target.src || e.target.href, { tag: e.target.tagName })
    }
    report('js_error', e.message, { file: String(e.filename || '').split('/').pop(), line: e.lineno })
  }, true)

  window.addEventListener('unhandledrejection', (e) => {
    report('js_error', e.reason?.message || e.reason, { kind: 'promise' })
  })
}

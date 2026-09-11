import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

const REASONS = [
  { key: 'nsfw', label: 'Откровенный контент' },
  { key: 'harassment', label: 'Оскорбление / травля' },
  { key: 'spam', label: 'Спам или реклама' },
  { key: 'not_outfit', label: 'Не образ / не по теме' },
  { key: 'other', label: 'Другое' },
]

export default function ReportModal({ postId, targetId, onClose }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function send(reason) {
    if (busy) return
    setBusy(true)
    const body = { action: 'report', initData: getInitData(), reason }
    if (postId) body.post_id = postId
    else body.target_id = targetId
    const { error } = await supabase.functions.invoke('quick-handler', { body })
    setBusy(false)
    if (!error) setDone(true)
    else onClose?.()
  }

  if (done) {
    return (
      <div className="confirm" onClick={onClose}>
        <div className="confirm__box">
          <div className="confirm__title">Жалоба отправлена</div>
          <div className="confirm__hint">Спасибо, мы проверим.</div>
        </div>
      </div>
    )
  }

  return (
    <div className="confirm">
      <div className="confirm__box">
        <div className="confirm__title">{postId ? 'Пожаловаться на образ' : 'Пожаловаться на профиль'}</div>
        <div className="confirm__hint">Выбери причину — мы проверим.</div>
        {REASONS.map((r) => (
          <button
            key={r.key}
            className="confirm__no"
            style={{ width: '100%', marginTop: 8 }}
            onClick={() => send(r.key)}
            disabled={busy}
          >
            {r.label}
          </button>
        ))}
        <div className="confirm__row">
          <button className="confirm__no" onClick={onClose} disabled={busy}>Отмена</button>
        </div>
      </div>
    </div>
  )
}

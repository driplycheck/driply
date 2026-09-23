import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, EyeOff, Check, Ban } from 'lucide-react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { t, timeAgo } from './i18n.js'
import Button from './components/ui/Button.jsx'
import './moderation.css'

// ключи те же, что в форме жалобы (ReportModal)
const REASON_LABEL = {
  nsfw: 'r_nsfw', harassment: 'r_harassment', spam: 'r_spam',
  not_outfit: 'r_not_outfit', other: 'r_other',
}

export default function Moderation({ onClose, onChanged }) {
  const [queue, setQueue] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'mod_queue', initData: getInitData() },
    })
    if (error) { setError(t('mod_forbidden')); setQueue([]); return }
    setQueue(Array.isArray(data) ? data : [])
  }, [])

  useEffect(() => { load() }, [load])

  async function act(reportId, modAction) {
    if (busyId) return
    setBusyId(reportId)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'mod_act', initData: getInitData(), report_id: reportId, mod_action: modAction },
    })
    setBusyId(null)
    if (error) { setError(t('retry_failed')); return }
    setQueue((list) => list.filter((r) => r.report_id !== reportId))
    onChanged?.()
  }

  return (
    <div className="mod">
      <header className="mod__top">
        <button className="mod__back" onClick={onClose} aria-label={t('back')}><ChevronLeft size={22} strokeWidth={2} /></button>
        <span className="mod__title">{t('moderation')}</span>
        <span className="mod__count">{queue?.length ?? ''}</span>
      </header>

      <div className="mod__body">
        {error && <div className="mod__state">{error}</div>}
        {!queue ? (
          <div className="mod__state">{t('loading')}</div>
        ) : queue.length === 0 ? (
          <div className="mod__state">{t('mod_empty')}</div>
        ) : queue.map((r) => (
          <article className="modcard" key={r.report_id}>
            {r.media_url && <img className="modcard__photo" src={r.media_url} alt="" loading="lazy" />}
            <div className="modcard__side">
              <div className="modcard__reason">{t(REASON_LABEL[r.reason] || 'r_other')}</div>
              <div className="modcard__meta">
                {r.reported_name || '—'}
                {r.reports_on_user > 1 && <span className="modcard__badge">{t('mod_reports_n', { n: r.reports_on_user })}</span>}
              </div>
              {r.caption && <p className="modcard__caption">{r.caption}</p>}
              <div className="modcard__meta modcard__meta--dim">
                {t('mod_from', { who: r.reporter ? '@' + r.reporter : '—' })} · {timeAgo(r.created_at)}
                {r.post_hidden && ` · ${t('mod_already_hidden')}`}
              </div>

              <div className="modcard__actions">
                <Button variant="primary" onClick={() => act(r.report_id, 'uphold')} disabled={busyId === r.report_id}>
                  <EyeOff size={16} strokeWidth={2} /> {t('mod_hide')}
                </Button>
                <Button variant="secondary" onClick={() => act(r.report_id, 'dismiss')} disabled={busyId === r.report_id}>
                  <Check size={16} strokeWidth={2.4} /> {t('mod_dismiss')}
                </Button>
                {r.reports_on_user > 1 && (
                  <button className="modcard__danger" onClick={() => act(r.report_id, 'hide_author')} disabled={busyId === r.report_id}>
                    <Ban size={15} strokeWidth={2} /> {t('mod_hide_author')}
                  </button>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

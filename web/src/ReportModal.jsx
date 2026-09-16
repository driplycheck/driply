import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { t } from './i18n.js'

const REASONS = [
  { key: 'nsfw', labelKey: 'r_nsfw' },
  { key: 'harassment', labelKey: 'r_harassment' },
  { key: 'spam', labelKey: 'r_spam' },
  { key: 'not_outfit', labelKey: 'r_not_outfit' },
  { key: 'other', labelKey: 'r_other' },
]

export default function ReportModal({ postId, targetId, onClose, onReported }) {
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  function send(reason) {
    if (busy) return
    setBusy(true)
    const body = { action: 'report', initData: getInitData(), reason }
    if (postId) body.post_id = postId
    else body.target_id = targetId
    // fire-and-forget: the user does not need to wait for the server
    supabase.functions.invoke('quick-handler', { body })
    setDone(true)
    onReported?.(postId)
  }

  if (done) {
    return (
      <div className="confirm" onClick={onClose}>
        <div className="confirm__box">
          <div className="confirm__title">{t('report_sent')}</div>
          <div className="confirm__hint">{t('report_thanks')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="confirm">
      <div className="confirm__box">
        <div className="confirm__title">{postId ? t('report_look') : t('report_profile')}</div>
        <div className="confirm__hint">{t('report_reason')}</div>
        {REASONS.map((r) => (
          <button
            key={r.key}
            className="confirm__no"
            style={{
              display: 'block',
              width: '100%',
              marginTop: 8,
              textAlign: 'center',
              fontWeight: 500,
            }}
            onClick={() => send(r.key)}
            disabled={busy}
          >
            {t(r.labelKey)}
          </button>
        ))}
        <button
          onClick={onClose}
          disabled={busy}
          style={{
            display: 'block',
            width: '100%',
            marginTop: 16,
            padding: '10px 0',
            background: 'transparent',
            border: 'none',
            color: '#8a8a8a',
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  )
}

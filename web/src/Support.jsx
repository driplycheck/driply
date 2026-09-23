import { useState } from 'react'
import { ChevronLeft, Check } from 'lucide-react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { t } from './i18n.js'
import Button from './components/ui/Button.jsx'
import Chip from './components/ui/Chip.jsx'

const MAX = 1000
const KINDS = ['bug', 'idea', 'partner']

export default function Support({ onClose }) {
  const [kind, setKind] = useState('bug')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function send() {
    const body = text.trim()
    if (busy || body.length < 3) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'support', initData: getInitData(), text: body, kind },
    })
    setBusy(false)
    if (error) {
      // причина лежит в теле ответа, а не в самом error — иначе всё выглядит как «попробуй ещё раз»
      const code = await error.context?.json?.().then((r) => r?.error).catch(() => null)
      setError(t(code === 'RATE_LIMIT' ? 'support_too_often' : code === 'TOO_SHORT' ? 'support_too_short' : 'support_failed'))
      return
    }
    setSent(true)
    setText('')
  }

  return (
    <div className="pedit">
      <header className="pedit__top">
        <button className="pedit__close" onClick={onClose} aria-label={t('back')}>
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <span className="pedit__title">{t('support')}</span>
        <span />
      </header>

      <div className="pedit__body">
        {sent ? (
          <div className="support__done">
            <span className="support__check"><Check size={26} strokeWidth={2.6} /></span>
            <h2>{t('support_sent_title')}</h2>
            <p>{t('support_sent_hint')}</p>
            <Button variant="secondary" onClick={() => setSent(false)}>{t('support_write_more')}</Button>
          </div>
        ) : (
          <>
            <p className="support__lead">{t('support_lead')}</p>
            <div className="support__kinds">
              {KINDS.map((k) => (
                <Chip key={k} active={kind === k} onClick={() => setKind(k)}>{t('support_kind_' + k)}</Chip>
              ))}
            </div>
            <label className="pfield">
              <span className="pfield__label">{t('support_label')}</span>
              <textarea
                className="pfield__input"
                placeholder={t('support_ph_' + kind)}
                rows={6}
                maxLength={MAX}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <span className="pfield__count">{text.length} / {MAX}</span>
            </label>
            {error && <div className="composer__err">{error}</div>}
            <Button variant="primary" onClick={send} disabled={busy || text.trim().length < 3}>
              {busy ? '…' : t('support_send')}
            </Button>
            <p className="support__note">{t('support_note')}</p>
          </>
        )}
      </div>
    </div>
  )
}

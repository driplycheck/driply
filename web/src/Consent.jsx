import { useState } from 'react'
import { Check } from 'lucide-react'
import { call, errorText } from './api.js'
import { t } from './i18n.js'
import { LEGAL_VERSION } from './legal/docs.js'
import Legal from './Legal.jsx'

// Три согласия по 152-ФЗ даются раздельно и не отмечены заранее:
// оферта, обработка данных (ст. 9) и распространение (ст. 10.1).
const BOXES = [
  { id: 'terms', doc: 'terms', label: 'consent_box_terms', link: 'terms_of_use' },
  { id: 'processing', doc: 'processing', label: 'consent_box_processing', link: 'consent_processing' },
  { id: 'publication', doc: 'publication', label: 'consent_box_publication', link: 'consent_publication' },
]

export default function Consent({ onAccepted }) {
  const [doc, setDoc] = useState(null)
  const [checked, setChecked] = useState({})
  const [optional, setOptional] = useState({ gender: true, username: true })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const all = BOXES.every((b) => checked[b.id])

  async function accept() {
    if (!all || busy) return
    setBusy(true)
    setError(null)
    const res = await call('accept_terms', { version: LEGAL_VERSION, details: { optional } })
    setBusy(false)
    if (!res.ok) { setError(errorText(res.code)); return }
    onAccepted(LEGAL_VERSION)
  }

  if (doc) return <Legal doc={doc} onClose={() => setDoc(null)} />

  return (
    <div className="consent">
      <div className="consent__box">
        <h1 className="consent__title">{t('consent_title')}</h1>
        <p className="consent__text">{t('consent_text')}</p>

        <div className="consent__boxes">
          {BOXES.map((b) => (
            <label className="cbox" key={b.id}>
              <input
                type="checkbox"
                checked={Boolean(checked[b.id])}
                onChange={(e) => setChecked((c) => ({ ...c, [b.id]: e.target.checked }))}
              />
              <span className="cbox__mark"><Check size={14} strokeWidth={3} /></span>
              <span className="cbox__text">
                {t(b.label)}{' '}
                <button type="button" className="cbox__link" onClick={(e) => { e.preventDefault(); setDoc(b.doc) }}>
                  {t(b.link)}
                </button>
              </span>
            </label>
          ))}
        </div>

        {/* необязательные категории распространения — их можно не разрешать */}
        <div className="consent__opt">
          <span className="consent__opt-title">{t('consent_optional')}</span>
          {[['gender', 'consent_opt_gender'], ['username', 'consent_opt_username']].map(([id, label]) => (
            <label className="cbox cbox--small" key={id}>
              <input
                type="checkbox"
                checked={optional[id]}
                onChange={(e) => setOptional((o) => ({ ...o, [id]: e.target.checked }))}
              />
              <span className="cbox__mark"><Check size={12} strokeWidth={3} /></span>
              <span className="cbox__text">{t(label)}</span>
            </label>
          ))}
        </div>

        <p className="consent__age">{t('consent_age')}</p>
        {error && <div className="composer__err">{error}</div>}

        <button className="consent__btn" onClick={accept} disabled={busy || !all}>
          {busy ? '…' : t('consent_accept')}
        </button>
      </div>
    </div>
  )
}

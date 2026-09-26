import { useState } from 'react'
import { call, errorText } from './api.js'
import { t } from './i18n.js'
import { LEGAL_VERSION } from './legal/docs.js'
import Legal from './Legal.jsx'

// Экран согласия. Показывается один раз — новым людям после регистрации
// и всем остальным, когда документы существенно поменялись.
export default function Consent({ onAccepted }) {
  const [doc, setDoc] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function accept() {
    setBusy(true)
    setError(null)
    const res = await call('accept_terms', { version: LEGAL_VERSION })
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

        <div className="consent__docs">
          <button className="consent__doc" onClick={() => setDoc('terms')}>{t('terms_of_use')}</button>
          <button className="consent__doc" onClick={() => setDoc('privacy')}>{t('privacy_policy')}</button>
        </div>

        <p className="consent__age">{t('consent_age')}</p>
        {error && <div className="composer__err">{error}</div>}

        <button className="consent__btn" onClick={accept} disabled={busy}>
          {busy ? '…' : t('consent_accept')}
        </button>
      </div>
    </div>
  )
}

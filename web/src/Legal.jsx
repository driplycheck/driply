import { ChevronLeft } from 'lucide-react'
import { t, activeLang } from './i18n.js'
import { LEGAL, LEGAL_VERSION, OPERATOR } from './legal/docs.js'
import './legal/legal.css'

// Показ документа: политика или условия. Тексты живут в legal/docs.js целиком.
export default function Legal({ doc = 'privacy', onClose }) {
  const lang = LEGAL[activeLang()] ? activeLang() : 'ru'
  const d = LEGAL[lang][doc]

  return (
    <div className="legal">
      <header className="scr-top">
        <button className="scr-back" onClick={onClose} aria-label={t('back')}>
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <span className="scr-title">{d.title}</span>
        <span className="scr-spacer" />
      </header>

      <div className="legal__body">
        <p className="legal__updated">{t('legal_updated')}: {d.updated} · {LEGAL_VERSION}</p>
        <p className="legal__intro">{d.intro}</p>

        {d.sections.map((s) => (
          <section className="legal__sec" key={s.h}>
            <h2>{s.h}</h2>
            {s.p?.map((text) => <p key={text}>{text}</p>)}
            {s.list && (
              <ul>
                {s.list.map((text) => <li key={text}>{text}</li>)}
              </ul>
            )}
          </section>
        ))}

        <p className="legal__contact">
          {t('legal_contact')} {OPERATOR.email || OPERATOR.telegram}
        </p>
      </div>
    </div>
  )
}

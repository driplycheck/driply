import { ChevronLeft } from 'lucide-react'
import { t } from './i18n.js'

export default function AboutApp({ onClose }) {
  return (
    <div className="about">
      <header className="about__top">
        <button className="about__back" onClick={onClose} aria-label={t('back')}>
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <span className="about__title">{t('about_app')}</span>
        <span className="about__spacer" />
      </header>
      <div className="about__body">
        <p>{t('about_intro')}</p>

        <h3>{t('rules_title')}</h3>
        <ul>
          <li>{t('rule_style')}</li>
          <li>{t('rule_respect')}</li>
          <li>{t('rule_content')}</li>
          <li>{t('rule_violation')}</li>
        </ul>

        <h3>{t('privacy_title')}</h3>
        <p>{t('privacy_text')}</p>
      </div>
    </div>
  )
}

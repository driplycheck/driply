import { t } from './i18n.js'

export default function AboutApp({ onClose }) {
  return (
    <div className="search">
      <header className="search__top">
        <button className="search__close" onClick={onClose}>{t('back')}</button>
        <span className="search__title">{t('about_app')}</span>
        <span className="search__spacer" />
      </header>
      <div className="search__body about-body">
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

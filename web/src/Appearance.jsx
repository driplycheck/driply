import { t } from './i18n.js'
import { hapticSelect } from './telegram.js'
import { useTheme, CHOICES } from './theme/ThemeProvider.jsx'
import './theme/appearance.css'

// мини-экран, нарисованный токенами своей темы: data-theme переопределяет их внутри
function ThemeSketch({ theme }) {
  return (
    <div className="sketch" data-theme={theme}>
      <span className="sketch__glow" />
      <span className="sketch__logo">driply<i /></span>
      <span className="sketch__chips">
        <span className="sketch__chip sketch__chip--on" />
        <span className="sketch__chip" />
      </span>
      <span className="sketch__card">
        <span className="sketch__photo" />
        <span className="sketch__line" />
        <span className="sketch__row">
          <span className="sketch__line sketch__line--short" />
          <span className="sketch__coin">d</span>
        </span>
      </span>
    </div>
  )
}

function Option({ id, active, onPick }) {
  return (
    <button
      className={`themeopt ${active ? 'themeopt--on' : ''}`}
      onClick={() => onPick(id)}
      aria-pressed={active}
    >
      <span className="themeopt__frame">
        {id === 'auto' ? (
          <span className="themeopt__split">
            <ThemeSketch theme="dark" />
            <ThemeSketch theme="light" />
          </span>
        ) : (
          <ThemeSketch theme={id} />
        )}
        {active && (
          <span className="themeopt__check">
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor"
              strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
          </span>
        )}
      </span>
      <span className="themeopt__label">{t('theme_' + id)}</span>
    </button>
  )
}

export default function Appearance({ onClose }) {
  const { choice, setTheme, isPreview } = useTheme()

  function pick(id) {
    if (id === choice) return
    hapticSelect()
    setTheme(id)
  }

  return (
    <div className="appearance">
      <header className="appearance__top">
        <button className="appearance__back" onClick={onClose}>{t('back')}</button>
        <span className="appearance__title">{t('appearance')}</span>
        <span className="appearance__spacer" />
      </header>
      <div className="appearance__body">
        <div className="themegrid">
          {CHOICES.map((id) => (
            <Option key={id} id={id} active={choice === id} onPick={pick} />
          ))}
        </div>
        <p className="appearance__hint">{t('theme_auto_hint')}</p>
        {isPreview && <p className="appearance__note">{t('theme_preview_note')}</p>}
      </div>
    </div>
  )
}

import AboutApp from './AboutApp.jsx'
import { callOrToast } from './api.js'
import { useState } from 'react'
import { t, LANGS } from './i18n.js'
import { useTheme } from './theme/ThemeProvider.jsx'
import pkg from '../package.json'

// версия — в package.json: заметный деплой +0.1, конец редизайна — 2.0
const APP_VERSION = pkg.version.split('.').slice(0, 2).join('.')

function SettingsLink({ label, onClick }) {
  return (
    <button className="srow srow--tap" onClick={onClick}>
      <span className="srow__label">{label}</span>
      <span className="srow__chev">›</span>
    </button>
  )
}

function Toggle({ active, onClick, disabled, label }) {
  return (
    <button className={`toggle ${active ? 'toggle--on' : ''}`} onClick={onClick} disabled={disabled} aria-label={label}>
      <span className="toggle__knob" />
    </button>
  )
}

export default function Settings({ me, lang, onLang, onClose, onEditProfile, onChanged, onOpenBlocked, onOpenReferral, onOpenAppearance, onOpenModeration, onOpenSupport }) {
  const { enabled: themesEnabled } = useTheme()
  const [prefs, setPrefs] = useState({
    all: me.notify_prefs?.all !== false,
    follows: me.notify_prefs?.follows !== false,
    votes: me.notify_prefs?.votes !== false,
    referral: me.notify_prefs?.referral !== false,
  })
  const [busy, setBusy] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  async function togglePref(key) {
    if (busy) return
    const next = !prefs[key]
    const updated = { ...prefs, [key]: next }
    setPrefs(updated); setBusy(true)
    const res = await callOrToast('set_notify_prefs', { prefs: { [key]: next } })
    setBusy(false)
    if (!res.ok) { setPrefs(prefs); return }
    onChanged({ notify_prefs: updated })
  }

  return (
    <div className="settings">
      <header className="settings__top">
        <button className="settings__close" onClick={onClose}>{t('back')}</button>
        <span className="settings__title">{t('settings')}</span>
        <span className="settings__spacer" />
      </header>
      <div className="settings__body">

        <div className="ssection">{t('sec_general')}</div>
        <SettingsLink label={t('edit_profile')} onClick={onEditProfile} />
        {themesEnabled && <SettingsLink label={t('appearance')} onClick={onOpenAppearance} />}
        {me.is_founder && <SettingsLink label={t('moderation')} onClick={onOpenModeration} />}
        <div className="srow srow--col">
          <div className="srow__label">{t('language')}</div>
          <div className="langrow">
            {LANGS.map((l) => (
              <button key={l.code} className={`langopt ${lang === l.code ? 'langopt--on' : ''}`} onClick={() => onLang(l.code)}>{l.label}</button>
            ))}
          </div>
        </div>

        <div className="ssection">{t('sec_privacy')}</div>
        <SettingsLink label={t('blocked_list')} onClick={onOpenBlocked} />

        <div className="ssection">{t('sec_notify')}</div>
        <div className="srow">
          <div className="srow__text">
            <div className="srow__label">{t('notify_all')}</div>
            <div className="srow__hint">{t('notify_all_hint')}</div>
          </div>
          <Toggle active={prefs.all} onClick={() => togglePref('all')} disabled={busy} label="notify-all" />
        </div>
        {['follows', 'votes', 'referral'].map((key) => (
          <div className={`srow ${!prefs.all ? 'srow--off' : ''}`} key={key}>
            <div className="srow__text">
              <div className="srow__label">{t('notify_' + key)}</div>
            </div>
            <Toggle
              active={prefs.all && prefs[key]}
              onClick={() => togglePref(key)}
              disabled={busy || !prefs.all}
              label={'notify-' + key}
            />
          </div>
        ))}

        <SettingsLink label={t('referral')} onClick={onOpenReferral} />

        <div className="ssection">{t('sec_about')}</div>
        <SettingsLink label={t('support')} onClick={onOpenSupport} />
        <SettingsLink label={t('about_app')} onClick={() => setAboutOpen(true)} />
        <div className="srow">
          <span className="srow__label">{t('version')}</span>
          <span className="srow__hint">{APP_VERSION}</span>
        </div>

      </div>
      {aboutOpen && <AboutApp onClose={() => setAboutOpen(false)} />}
    </div>
  )
}

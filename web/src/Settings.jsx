import AboutApp from './AboutApp.jsx'
import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { t, LANGS } from './i18n.js'

const APP_VERSION = '1.0'
const SUPPORT_URL = 'https://t.me/Driplycheckbot'

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

export default function Settings({ me, lang, onLang, side, onSide, onClose, onEditProfile, onChanged, onOpenBlocked, onOpenReferral }) {
  const [hide, setHide] = useState(!!me.hide_username)
  const [gender, setGender] = useState(me.gender ?? null)
  const [prefs, setPrefs] = useState({
    all: me.notify_prefs?.all !== false,
    follows: me.notify_prefs?.follows !== false,
    votes: me.notify_prefs?.votes !== false,
    referral: me.notify_prefs?.referral !== false,
  })
  const [busy, setBusy] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  async function saveProfile(update, rollback) {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_profile', initData: getInitData(),
        display_name: me.display_name, avatar_url: me.avatar_url, ...update },
    })
    setBusy(false)
    if (error) { rollback(); return false }
    onChanged(update)
    return true
  }

  async function toggleHide() {
    const next = !hide
    setHide(next)
    await saveProfile({ hide_username: next }, () => setHide(!next))
  }

  async function togglePref(key) {
    if (busy) return
    const next = !prefs[key]
    const updated = { ...prefs, [key]: next }
    setPrefs(updated); setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_notify_prefs', initData: getInitData(), prefs: { [key]: next } },
    })
    setBusy(false)
    if (error) { setPrefs(prefs); return }
    onChanged({ notify_prefs: updated })
  }

  async function changeGender(g) {
    if (busy) return
    const previous = gender
    setGender(g)
    await saveProfile({ gender: g }, () => setGender(previous))
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
        <div className="srow srow--col">
          <div className="srow__label">{t('interface_side')}</div>
          <div className="langrow">
            <button className={`langopt ${side === 'left' ? 'langopt--on' : ''}`} onClick={() => onSide('left')}>{t('side_left')}</button>
            <button className={`langopt ${side === 'right' ? 'langopt--on' : ''}`} onClick={() => onSide('right')}>{t('side_right')}</button>
          </div>
        </div>
        <div className="srow srow--col">
          <div className="srow__label">{t('language')}</div>
          <div className="langrow">
            {LANGS.map((l) => (
              <button key={l.code} className={`langopt ${lang === l.code ? 'langopt--on' : ''}`} onClick={() => onLang(l.code)}>{l.label}</button>
            ))}
          </div>
        </div>
        <div className="srow srow--col">
          <div className="srow__label">{t('gender')}</div>
          <div className="langrow">
            <button className={`langopt ${gender === 'male' ? 'langopt--on' : ''}`} onClick={() => changeGender('male')}>👨 {t('gender_male')}</button>
            <button className={`langopt ${gender === 'female' ? 'langopt--on' : ''}`} onClick={() => changeGender('female')}>👩 {t('gender_female')}</button>
          </div>
        </div>

        <div className="ssection">{t('sec_privacy')}</div>
        <div className="srow">
          <div className="srow__text">
            <div className="srow__label">{t('hide_username')}</div>
            <div className="srow__hint">{t('hide_username_hint')}</div>
          </div>
          <Toggle active={hide} onClick={toggleHide} disabled={busy} label="hide" />
        </div>
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
        <a className="srow srow--tap" href={SUPPORT_URL} target="_blank" rel="noreferrer">
          <span className="srow__label">{t('support')}</span>
          <span className="srow__chev">›</span>
        </a>
        <SettingsLink label="О Driply" onClick={() => setAboutOpen(true)} />
        <div className="srow">
          <span className="srow__label">{t('version')}</span>
          <span className="srow__hint">{APP_VERSION}</span>
        </div>

      </div>
      {aboutOpen && <AboutApp onClose={() => setAboutOpen(false)} />}
    </div>
  )
}

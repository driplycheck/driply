import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { t, LANGS } from './i18n.js'

const APP_VERSION = '1.0'
const SUPPORT_URL = 'https://t.me/Driplycheckbot'

export default function Settings({ me, lang, onLang, side, onSide, onClose, onEditProfile, onChanged, onOpenBlocked, onOpenReferral }) {
  const [hide, setHide] = useState(!!me.hide_username)
  const [gender, setGender] = useState(me.gender ?? null)
  const [notify, setNotify] = useState(me.notify_follows !== false)
  const [allowDm, setAllowDm] = useState(me.allow_dm !== false)
  const [busy, setBusy] = useState(false)

  async function toggleHide() {
    if (busy) return
    const next = !hide
    setHide(next); setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_profile', initData: getInitData(),
        display_name: me.display_name, avatar_url: me.avatar_url, hide_username: next },
    })
    setBusy(false)
    if (error) { setHide(!next); return }
    onChanged({ hide_username: next })
  }

  async function toggleDm() {
    if (busy) return
    const next = !allowDm
    setAllowDm(next); setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_profile', initData: getInitData(),
        display_name: me.display_name, avatar_url: me.avatar_url, allow_dm: next },
    })
    setBusy(false)
    if (error) { setAllowDm(!next); return }
    onChanged({ allow_dm: next })
  }

  async function changeGender(g) {
    if (busy) return
    setGender(g)
    setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_profile', initData: getInitData(),
        display_name: me.display_name, avatar_url: me.avatar_url, gender: g },
    })
    setBusy(false)
    if (error) { setGender(me.gender ?? null); return }
    onChanged({ gender: g })
  }

  async function toggleNotify() {
    if (busy) return
    const next = !notify
    setNotify(next); setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_notify', initData: getInitData(), notify: next },
    })
    setBusy(false)
    if (error) { setNotify(!next); return }
    onChanged({ notify_follows: next })
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
        <button className="srow srow--tap" onClick={onEditProfile}>
          <span className="srow__label">{t('edit_profile')}</span>
          <span className="srow__chev">›</span>
        </button>
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
          <button className={`toggle ${hide ? 'toggle--on' : ''}`} onClick={toggleHide} disabled={busy} aria-label="hide">
            <span className="toggle__knob" />
          </button>
        </div>
        <div className="srow">
          <div className="srow__text">
            <div className="srow__label">{t('dm_allow')}</div>
            <div className="srow__hint">{t('dm_allow_hint')}</div>
          </div>
          <button className={`toggle ${allowDm ? 'toggle--on' : ''}`} onClick={toggleDm} disabled={busy} aria-label="dm">
            <span className="toggle__knob" />
          </button>
        </div>
        <button className="srow srow--tap" onClick={onOpenBlocked}>
          <span className="srow__label">{t('blocked_list')}</span>
          <span className="srow__chev">›</span>
        </button>

        <div className="ssection">{t('sec_notify')}</div>
        <div className="srow">
          <div className="srow__text">
            <div className="srow__label">{t('notify_follows')}</div>
            <div className="srow__hint">{t('notify_hint')}</div>
          </div>
          <button className={`toggle ${notify ? 'toggle--on' : ''}`} onClick={toggleNotify} disabled={busy} aria-label="notify">
            <span className="toggle__knob" />
          </button>
        </div>

        <button className="srow srow--tap" onClick={onOpenReferral}>
          <span className="srow__label">{t('referral')}</span>
          <span className="srow__chev">›</span>
        </button>

        <div className="ssection">{t('sec_about')}</div>
        <a className="srow srow--tap" href={SUPPORT_URL} target="_blank" rel="noreferrer">
          <span className="srow__label">{t('support')}</span>
          <span className="srow__chev">›</span>
        </a>
        <div className="srow srow--col">
          <div className="srow__label">{t('about_app')}</div>
          <div className="srow__hint">{t('about_text')}</div>
        </div>
        <div className="srow">
          <span className="srow__label">{t('version')}</span>
          <span className="srow__hint">{APP_VERSION}</span>
        </div>

      </div>
    </div>
  )
}

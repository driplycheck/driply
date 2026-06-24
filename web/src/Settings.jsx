import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { t, LANGS } from './i18n.js'

export default function Settings({ me, lang, onLang, side, onSide, onClose, onEditProfile, onChanged }) {
  const [hide, setHide] = useState(!!me.hide_username)
  const [busy, setBusy] = useState(false)

  async function toggleHide() {
    if (busy) return
    const next = !hide
    setHide(next)
    setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: {
        action: 'set_profile', initData: getInitData(),
        display_name: me.display_name, avatar_url: me.avatar_url, hide_username: next,
      },
    })
    setBusy(false)
    if (error) { setHide(!next); return }
    onChanged({ hide_username: next })
  }

  return (
    <div className="settings">
      <header class="settings__top" className="settings__top">
        <button className="settings__close" onClick={onClose}>{t('back')}</button>
        <span className="settings__title">{t('settings')}</span>
        <span className="settings__spacer" />
      </header>
      <div className="settings__body">
        <button className="srow srow--tap" onClick={onEditProfile}>
          <span className="srow__label">{t('edit_profile')}</span>
          <span className="srow__chev">›</span>
        </button>
        <div className="srow">
          <div className="srow__text">
            <div className="srow__label">{t('hide_username')}</div>
            <div className="srow__hint">{t('hide_username_hint')}</div>
          </div>
          <button className={`toggle ${hide ? 'toggle--on' : ''}`} onClick={toggleHide} disabled={busy} aria-label="hide">
            <span className="toggle__knob" />
          </button>
        </div>
        <div className="srow srow--col">
          <div className="srow__label">{t('interface_side')}</div>
          <div className="langrow">
            <button className={`langopt ${side === 'left' ? 'langopt--on' : ''}`} onClick={() => onSide('left')}>
              {t('side_left')}
            </button>
            <button className={`langopt ${side === 'right' ? 'langopt--on' : ''}`} onClick={() => onSide('right')}>
              {t('side_right')}
            </button>
          </div>
        </div>
        <div className="srow srow--col">
          <div className="srow__label">{t('language')}</div>
          <div className="langrow">
            {LANGS.map((l) => (
              <button key={l.code}
                className={`langopt ${lang === l.code ? 'langopt--on' : ''}`}
                onClick={() => onLang(l.code)}>
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

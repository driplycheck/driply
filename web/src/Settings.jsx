import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

export default function Settings({ me, onClose, onEditProfile, onChanged }) {
  const [hide, setHide] = useState(!!me.hide_username)
  const [busy, setBusy] = useState(false)

  async function toggleHide() {
    if (busy) return
    const next = !hide
    setHide(next)
    setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: {
        action: 'set_profile',
        initData: getInitData(),
        display_name: me.display_name,
        avatar_url: me.avatar_url,
        hide_username: next,
      },
    })
    setBusy(false)
    if (error) { setHide(!next); return }
    onChanged({ hide_username: next })
  }

  return (
    <div className="settings">
      <header className="settings__top">
        <button className="settings__close" onClick={onClose}>‹ Назад</button>
        <span className="settings__title">Настройки</span>
        <span className="settings__spacer" />
      </header>
      <div className="settings__body">
        <button className="srow srow--tap" onClick={onEditProfile}>
          <span className="srow__label">Редактировать профиль</span>
          <span className="srow__chev">›</span>
        </button>
        <div className="srow">
          <div className="srow__text">
            <div className="srow__label">Скрывать @username</div>
            <div className="srow__hint">Другие не увидят твой ник в Telegram</div>
          </div>
          <button
            className={`toggle ${hide ? 'toggle--on' : ''}`}
            onClick={toggleHide}
            disabled={busy}
            aria-label="Скрывать username"
          >
            <span className="toggle__knob" />
          </button>
        </div>
      </div>
    </div>
  )
}

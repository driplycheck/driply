import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'
import { t } from './i18n.js'

export default function BlockedList({ onClose }) {
  const [people, setPeople] = useState(null)
  const [busyId, setBusyId] = useState(null)

  function tgId() {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? 0
  }
  async function load() {
    const { data } = await supabase.rpc('my_blocks', { p_tid: tgId() })
    setPeople(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  async function unblock(id) {
    if (busyId) return
    setBusyId(id)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_block', initData: getInitData(), target_id: id, block: false },
    })
    setBusyId(null)
    if (!error) await load()
  }

  return (
    <div className="follist">
      <header className="follist__top">
        <button className="follist__close" onClick={onClose}>{t('back')}</button>
        <span className="follist__title">{t('blocked_list')}</span>
        <span className="follist__spacer" />
      </header>
      <div className="follist__body">
        {!people ? (
          <div className="state">Загрузка…</div>
        ) : people.length === 0 ? (
          <div className="state">{t('no_blocks')}</div>
        ) : (
          people.map((u) => (
            <div className="sresult" key={u.id}>
              {u.avatar_url && (
                <img className={`sresult__ava ${avatarTier(u.style_score)}`} src={u.avatar_url} alt="" />
              )}
              <div className="sresult__text">
                <div className="sresult__name">{u.display_name || '@' + (u.username || 'user')}</div>
                {u.username && !u.hide_username && <div className="sresult__sub">@{u.username}</div>}
              </div>
              <button className="unblock-mini" disabled={busyId === u.id} onClick={() => unblock(u.id)}>
                {busyId === u.id ? '…' : t('unblock_user')}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

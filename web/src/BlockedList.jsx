import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { callOrToast, readPrivate } from './api.js'
import { avatarTier } from './tiers.js'
import { t } from './i18n.js'

export default function BlockedList({ onClose }) {
  const [people, setPeople] = useState(null)
  const [busyId, setBusyId] = useState(null)

  const load = useCallback(async () => {
    const data = await readPrivate('my_blocks')
    setPeople(Array.isArray(data) ? data : [])
  }, [])
  useEffect(() => { load() }, [load])

  async function unblock(id) {
    if (busyId) return
    setBusyId(id)
    const res = await callOrToast('set_block', { target_id: id, block: false })
    setBusyId(null)
    if (res.ok) await load()
  }

  return (
    <div className="follist">
      <header className="scr-top">
        <button className="scr-back" onClick={onClose} aria-label={t('back')}>
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <span className="scr-title">{t('blocked_list')}</span>
        <span className="scr-spacer" />
      </header>
      <div className="follist__body">
        {!people ? (
          <div className="state">{t('loading')}</div>
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

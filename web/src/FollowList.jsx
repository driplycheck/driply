import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'
import { t } from './i18n.js'

export default function FollowList({ userId, mode, onClose, onOpenProfile }) {
  const [tab, setTab] = useState(mode)
  const [people, setPeople] = useState(null)

  useEffect(() => {
    let active = true
    setPeople(null)
    supabase.rpc('follow_list', { p_target: userId, p_mode: tab })
      .then(({ data }) => { if (active) setPeople(Array.isArray(data) ? data : []) })
    return () => { active = false }
  }, [userId, tab])

  function pick(id) {
    onOpenProfile(id)
  }

  return (
    <div className="follist">
      <header className="follist__top">
        <button className="follist__close" onClick={onClose}>{t('back')}</button>
        <span className="follist__spacer" />
      </header>

      <div className="follist__tabs">
        <button className={`follist__tab ${tab === 'followers' ? 'follist__tab--on' : ''}`}
          onClick={() => setTab('followers')}>{t('followers')}</button>
        <button className={`follist__tab ${tab === 'following' ? 'follist__tab--on' : ''}`}
          onClick={() => setTab('following')}>{t('following_cnt')}</button>
      </div>

      <div className="follist__body">
        {!people ? (
          <div className="state">Загрузка…</div>
        ) : people.length === 0 ? (
          <div className="state">
            {tab === 'followers' ? 'Пока нет подписчиков' : 'Пока ни на кого не подписан'}
          </div>
        ) : (
          people.map((u) => (
            <button className="sresult" key={u.id} onClick={() => pick(u.id)}>
              {u.avatar_url && (
                <img className={`sresult__ava ${avatarTier(u.style_score)}`} src={u.avatar_url} alt="" />
              )}
              <div className="sresult__text">
                <div className="sresult__name">{u.display_name || '@' + (u.username || 'user')}</div>
                {u.username && !u.hide_username && <div className="sresult__sub">@{u.username}</div>}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'

export default function FollowList({ userId, mode, onClose, onOpenProfile }) {
  const [people, setPeople] = useState(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      const filterCol = mode === 'followers' ? 'following_id' : 'follower_id'
      const pickCol = mode === 'followers' ? 'follower_id' : 'following_id'
      const { data: rows } = await supabase.from('follows').select(pickCol).eq(filterCol, userId)
      const ids = (rows || []).map((r) => r[pickCol])
      if (ids.length === 0) { if (active) setPeople([]); return }
      const { data: us } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, style_score, hide_username')
        .in('id', ids)
      if (active) setPeople(us || [])
    })()
    return () => { active = false }
  }, [userId, mode])

  const title = mode === 'followers' ? 'Подписчики' : 'Подписки'

  return (
    <div className="follist">
      <header className="follist__top">
        <button className="follist__close" onClick={onClose}>‹ Назад</button>
        <span className="follist__title">{title}</span>
        <span className="follist__spacer" />
      </header>
      <div className="follist__body">
        {!people ? (
          <div className="state">Загрузка…</div>
        ) : people.length === 0 ? (
          <div className="state">
            {mode === 'followers' ? 'Пока нет подписчиков' : 'Пока ни на кого не подписан'}
          </div>
        ) : (
          people.map((u) => (
            <button className="sresult" key={u.id} onClick={() => onOpenProfile(u.id)}>
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

import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'

export default function TopUsers({ onClose, onOpenProfile }) {
  const [users, setUsers] = useState(null)

  useEffect(() => {
    let active = true
    supabase.rpc('top_users', { p_limit: 50, p_offset: 0 })
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('top_users', error); setUsers([]); return }
        setUsers(data || [])
      })
    return () => { active = false }
  }, [])

  return (
    <div className="search">
      <header className="search__top">
        <button className="search__close" onClick={onClose}>‹ Назад</button>
        <span className="search__title">Топ по стилю</span>
        <span className="search__spacer" />
      </header>
      <div className="search__body">
        {!users ? (
          <div className="state">Загрузка…</div>
        ) : users.length === 0 ? (
          <div className="state">Рейтинг пока пуст</div>
        ) : (
          <div className="ssection">
            {users.map((u) => (
              <button className="sresult" key={u.id} onClick={() => onOpenProfile(u.id)}>
                <div className="sresult__rank">#{u.rank}</div>
                {u.avatar_url && (
                  <img className={`sresult__ava ${avatarTier(u.style_score)}`} src={u.avatar_url} alt="" />
                )}
                <div className="sresult__text">
                  <div className="sresult__name">{u.display_name || '@' + (u.username || 'user')}</div>
                  <div className="sresult__sub">★ {u.style_score}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

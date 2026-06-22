import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'

export default function Profile({ userId, onClose }) {
  const [user, setUser] = useState(null)
  const [rank, setRank] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: u } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, style_score')
        .eq('id', userId)
        .maybeSingle()
      if (!active) return
      setUser(u)
      if (u) {
        const { count } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gt('style_score', u.style_score)
        if (active) setRank((count ?? 0) + 1)
        const { data: p } = await supabase
          .from('posts')
          .select('id, media_url, score')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (active) setPosts(p || [])
      }
      if (active) setLoading(false)
    })()
    return () => {
      active = false
    }
  }, [userId])

  const displayName =
    user?.display_name || (user?.username ? '@' + user.username : 'user')

  return (
    <div className="profile">
      <header className="profile__top">
        <button className="profile__close" onClick={onClose}>‹ Назад</button>
      </header>
      {loading ? (
        <div className="state">Загрузка…</div>
      ) : !user ? (
        <div className="state">Профиль не найден</div>
      ) : (
        <div className="profile__body">
          <div className="profile__head">
            {user.avatar_url && (
              <img className={`profile__ava ${avatarTier(user.style_score)}`} src={user.avatar_url} alt="" />
            )}
            <div className="profile__name">{displayName}</div>
            {user.username && <div className="profile__handle">@{user.username}</div>}
          </div>
          <div className="profile__stats">
            <div className="stat">
              <div className="stat__num">★ {user.style_score}</div>
              <div className="stat__lbl">очки стиля</div>
            </div>
            <div className="stat">
              <div className="stat__num">#{rank}</div>
              <div className="stat__lbl">в рейтинге</div>
            </div>
            <div className="stat">
              <div className="stat__num">{posts.length}</div>
              <div className="stat__lbl">образов</div>
            </div>
          </div>
          {posts.length > 0 ? (
            <div className="grid">
              {posts.map((p) => (
                <div
                  className="grid__item"
                  key={p.id}
                  style={{ backgroundImage: `url(${p.media_url})` }}
                >
                  <span className="grid__score">★ {p.score}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="state">Пока нет образов</div>
          )}
        </div>
      )}
    </div>
  )
}

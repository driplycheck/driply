import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'

export default function Profile({ userId, selfId, onClose, onOpenSettings, onOpenPost, onFollowChanged }) {
  const [user, setUser] = useState(null)
  const [rank, setRank] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followers, setFollowers] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: u } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, bio, style_score, hide_username')
        .eq('id', userId).maybeSingle()
      if (!active) return
      setUser(u)
      if (u) {
        const { count: higher } = await supabase
          .from('users').select('*', { count: 'exact', head: true })
          .gt('style_score', u.style_score)
        if (active) setRank((higher ?? 0) + 1)

        const { data: p } = await supabase
          .from('posts').select('id, media_url, score')
          .eq('user_id', userId).order('created_at', { ascending: false })
        if (active) setPosts(p || [])

        const [{ count: fr }, { count: fg }] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', userId),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', userId),
        ])
        if (active) { setFollowers(fr ?? 0); setFollowingCount(fg ?? 0) }

        if (selfId && selfId !== userId) {
          const { data: rel } = await supabase
            .from('follows').select('follower_id')
            .eq('follower_id', selfId).eq('following_id', userId).maybeSingle()
          if (active) setFollowing(!!rel)
        }
      }
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [userId, selfId])

  async function toggleFollow() {
    if (busyFollow) return
    setBusyFollow(true)
    const { data, error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'toggle_follow', initData: getInitData(), target_id: userId },
    })
    setBusyFollow(false)
    if (!error && data) {
      setFollowing(data.following)
      setFollowers(data.followers)
      onFollowChanged?.()
    }
  }

  const isSelf = user && selfId && user.id === selfId
  const displayName = user?.display_name || (user?.username ? '@' + user.username : 'user')
  const showHandle = user?.username && (isSelf || !user.hide_username)

  return (
    <div className="profile">
      <header className="profile__top">
        <button className="profile__close" onClick={onClose}>‹ Назад</button>
        {isSelf && (
          <button className="profile__settings" onClick={onOpenSettings} aria-label="Настройки">⚙</button>
        )}
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
            {showHandle && <div className="profile__handle">@{user.username}</div>}
            {user.bio && <p className="profile__bio">{user.bio}</p>}
            <div className="profile__follows">{followers} подписчиков · {followingCount} подписок</div>
            {!isSelf && (
              <button
                className={`follow-btn ${following ? 'follow-btn--on' : ''}`}
                onClick={toggleFollow} disabled={busyFollow}
              >
                {following ? 'Отписаться' : 'Подписаться'}
              </button>
            )}
          </div>
          <div className="profile__stats">
            <div className="stat"><div className="stat__num">★ {user.style_score}</div><div className="stat__lbl">очки стиля</div></div>
            <div className="stat"><div className="stat__num">#{rank}</div><div className="stat__lbl">в рейтинге</div></div>
            <div className="stat"><div className="stat__num">{posts.length}</div><div className="stat__lbl">образов</div></div>
          </div>
          {posts.length > 0 ? (
            <div className="grid">
              {posts.map((p) => (
                <button className="grid__item" key={p.id}
                  style={{ backgroundImage: `url(${p.media_url})` }}
                  onClick={() => onOpenPost(p.id)}>
                  <span className="grid__score">★ {p.score}</span>
                </button>
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

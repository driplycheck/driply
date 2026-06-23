import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'
import FollowList from './FollowList.jsx'

export default function Profile({ userId, selfId, onClose, onOpenSettings, onOpenPost, onOpenProfile, onFollowChanged }) {
  const [user, setUser] = useState(null)
  const [rank, setRank] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followers, setFollowers] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)
  const [listMode, setListMode] = useState(null)

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
        const { data: higher } = await supabase
          .from('users').select('id').gt('style_score', u.style_score)
        if (active) setRank((higher?.length ?? 0) + 1)

        const { data: p } = await supabase
          .from('posts').select('id, media_url, score')
          .eq('user_id', userId).order('created_at', { ascending: false })
        if (active) setPosts(p || [])

        const [{ data: frRows }, { data: fgRows }] = await Promise.all([
          supabase.from('follows').select('follower_id').eq('following_id', userId),
          supabase.from('follows').select('following_id').eq('follower_id', userId),
        ])
        if (active) {
          setFollowers(frRows?.length ?? 0)
          setFollowingCount(fgRows?.length ?? 0)
          if (selfId && selfId !== userId) {
            setFollowing((frRows || []).some((r) => r.follower_id === selfId))
          }
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

  function openPerson(id) {
    setListMode(null)
    if (id !== userId) onOpenProfile?.(id)
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
            <div className="profile__follows">
              <button className="flink" onClick={() => setListMode('followers')}>
                <b>{followers}</b> подписчиков
              </button>
              <span className="flink__dot">·</span>
              <button className="flink" onClick={() => setListMode('following')}>
                <b>{followingCount}</b> подписок
              </button>
            </div>
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

      {listMode && (
        <FollowList
          userId={userId}
          mode={listMode}
          onClose={() => setListMode(null)}
          onOpenProfile={openPerson}
        />
      )}
    </div>
  )
}

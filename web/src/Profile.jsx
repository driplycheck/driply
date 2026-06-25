import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'
import { t } from './i18n.js'
import { shareRankCard } from './storyCard.js'
import { tg } from './telegram.js'
import FollowList from './FollowList.jsx'

export default function Profile({ userId, selfId, onClose, onOpenSettings, onOpenPost, onOpenProfile, onOpenArchive, onFollowChanged }) {
  const [user, setUser] = useState(null)
  const [rank, setRank] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [followers, setFollowers] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)
  const [listMode, setListMode] = useState(null)
  const [busyShare, setBusyShare] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [busyBlock, setBusyBlock] = useState(false)
  const [toast, setToast] = useState(null)

  async function loadRelations() {
    const { data } = await supabase.rpc('profile_relations', {
      p_target: userId, p_viewer: selfId ?? 0,
    })
    if (data) {
      setFollowers(data.followers ?? 0)
      setFollowingCount(data.following ?? 0)
      if (selfId && selfId !== userId) setFollowing(!!data.is_following)
    }
  }

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
          .eq('user_id', userId).eq('hidden', false).order('created_at', { ascending: false })
        if (active) setPosts(p || [])
        if (active) await loadRelations()
        if (selfId && selfId !== userId) {
          const { data: bl } = await supabase.rpc('is_blocked', { p_a: selfId, p_b: userId })
          if (active) setBlocked(!!bl)
        }
      }
      if (active) setLoading(false)
    })()
    return () => { active = false }
  }, [userId, selfId])

  function flash(m) { setToast(m); setTimeout(() => setToast(null), 2500) }

  async function setFollowState(want) {
    if (busyFollow) return
    setBusyFollow(true)
    setFollowing(want)
    setFollowers((n) => Math.max(0, n + (want ? 1 : -1)))
    const { data, error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_follow', initData: getInitData(), target_id: userId, follow: want },
    })
    setBusyFollow(false)
    if (error) {
      setFollowing(!want)
      setFollowers((n) => Math.max(0, n + (want ? -1 : 1)))
      return
    }
    if (data) {
      setFollowing(!!data.following)
      setFollowers(data.followers ?? followers)
      onFollowChanged?.()
      await loadRelations()
    }
  }

  async function share() {
    if (busyShare || !user) return
    setBusyShare(true)
    const res = await shareRankCard({ user, rank, postsCount: posts.length })
    setBusyShare(false)
    if (!res.ok) {
      flash(res.reason === 'unsupported' ? t('share_unsupported') : t('share_failed'))
    } else if (res.reward) {
      flash(`+${res.reward} кредитов за историю 🔥`)
    }
  }

  function inviteFriend() {
    const link = `https://t.me/Driplycheckbot?startapp=ref_${user.id}`
    const text = t('invite_text')
    if (tg && tg.openTelegramLink) {
      tg.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`)
    }
  }

  async function setBlockState(want) {
    if (busyBlock) return
    setBusyBlock(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_block', initData: getInitData(), target_id: userId, block: want },
    })
    setBusyBlock(false)
    if (!error) {
      setBlocked(want)
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
        <button className="profile__close" onClick={onClose}>{t('back')}</button>
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
                <b>{followers}</b> {t('followers')}
              </button>
              <span className="flink__dot">·</span>
              <button className="flink" onClick={() => setListMode('following')}>
                <b>{followingCount}</b> {t('following_cnt')}
              </button>
            </div>
            {isSelf ? (
              <button className="story-btn" onClick={share} disabled={busyShare}>
                {busyShare ? '…' : t('share_story')}
              </button>
            ) : (
              <button
                className={`follow-btn ${following ? 'follow-btn--on' : ''}`}
                onClick={() => setFollowState(!following)} disabled={busyFollow}
              >
                {following ? t('unfollow') : t('follow')}
              </button>
            )}
            {!isSelf && (
              <button className="block-btn" onClick={() => setBlockState(!blocked)} disabled={busyBlock}>
                {blocked ? t('unblock_user') : t('block_user')}
              </button>
            )}
            {isSelf && (
              <button className="archive-btn" onClick={onOpenArchive}>Архив публикаций</button>
            )}
            {isSelf && (
              <button className="invite-btn" onClick={inviteFriend}>{t('invite_friend')}</button>
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

      {toast && <div className="ptoast">{toast}</div>}

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

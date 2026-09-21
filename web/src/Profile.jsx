import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'
import { t } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'
import FollowList from './FollowList.jsx'
import ReportModal from './ReportModal.jsx'

async function fetchRelations(userId, selfId) {
  const { data } = await supabase.rpc('profile_relations', {
    p_target: userId, p_viewer: selfId ?? 0,
  })
  return data
}

async function fetchProfileData(userId, selfId) {
  const { data: user } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, bio, style_score, hide_username, allow_dm, badge')
    .eq('id', userId).maybeSingle()

  if (!user) return { user: null }

  const requests = [
    supabase.from('users').select('id', { count: 'exact', head: true }).gt('style_score', user.style_score),
    supabase.from('posts').select('id, media_url, score')
      .eq('user_id', userId).eq('hidden', false).order('created_at', { ascending: false }),
    fetchRelations(userId, selfId),
  ]

  if (selfId && selfId !== userId) {
    requests.push(supabase.rpc('is_blocked', { p_a: selfId, p_b: userId }).then(({ data }) => data))
  }

  const [higherResult, postsResult, relations, blocked] = await Promise.all(requests)
  return {
    user,
    rank: (higherResult.count ?? 0) + 1,
    posts: postsResult.data || [],
    relations,
    blocked: !!blocked,
  }
}

export default function Profile({ userId, selfId, onClose, onOpenSettings, onOpenPost, onOpenProfile, onOpenArchive, onOpenVotes, onOpenTop, onFollowChanged }) {
  const [user, setUser] = useState(null)
  const [rank, setRank] = useState(null)
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [reportOpen, setReportOpen] = useState(false)
  const [followers, setFollowers] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [busyFollow, setBusyFollow] = useState(false)
  const [listMode, setListMode] = useState(null)
  const [blocked, setBlocked] = useState(false)
  const [busyBlock, setBusyBlock] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const profile = await fetchProfileData(userId, selfId)
      if (!active) return
      setUser(profile.user)
      setRank(profile.rank ?? null)
      setPosts(profile.posts || [])
      setBlocked(profile.blocked || false)
      if (profile.relations) {
        setFollowers(profile.relations.followers ?? 0)
        setFollowingCount(profile.relations.following ?? 0)
        if (selfId && selfId !== userId) setFollowing(!!profile.relations.is_following)
      }
      setLoading(false)
    })()
    return () => { active = false }
  }, [userId, selfId])

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
      setFollowers((current) => data.followers ?? current)
      onFollowChanged?.()
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
        <div className="profile__topright">
          {isSelf && (
            <button className="profile__archive" onClick={onOpenVotes} aria-label={t('my_votes')}><DripCoin size={20} tone="ink" /></button>
          )}
          {isSelf && (
            <button className="profile__archive" onClick={onOpenArchive} aria-label={t('archive_aria')}>🗂</button>
          )}
          {isSelf && (
            <button className="profile__settings" onClick={onOpenSettings} aria-label={t('settings')}>⚙</button>
          )}
          {!isSelf && (
            <>
              <button className={`profile__block ${blocked ? 'profile__block--on' : ''}`}
                onClick={() => setBlockState(!blocked)} disabled={busyBlock}
                aria-label={blocked ? t('unblock_user') : t('block_user')} title={blocked ? t('unblock_user') : t('block_user')}>
                {blocked ? '↺' : '⊘'}
              </button>
              <button className="profile__block"
                onClick={() => setReportOpen(true)}
                aria-label={t('report')} title={t('report')}>
                🚩
              </button>
            </>
          )}
        </div>
      </header>
      {loading ? (
        <div className="state">{t('loading')}</div>
      ) : !user ? (
        <div className="state">{t('profile_not_found')}</div>
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
            {user.badge && (
              <div className="status-wrap">
                <div className={`status-plate status-plate--${user.badge}`}>
                  {
                    { founder: t('badge_founder'), cofounder: t('badge_founder'), first_drip: <><DripCoin size={12} /> {t('badge_first_drip')}</> }[user.badge]
                    || user.badge
                  }
                </div>
              </div>
            )}
            {!isSelf && (
              <button
                className={`follow-btn ${following ? 'follow-btn--on' : ''}`}
                onClick={() => setFollowState(!following)} disabled={busyFollow}
              >
                {following ? t('unfollow') : t('follow')}
              </button>
            )}



          </div>
          <div className="profile__stats">
            <div className="stat"><div className="stat__num"><DripCoin size={16} /> {user.style_score}</div><div className="stat__lbl">{t('stat_style_score')}</div></div>
            <button className="stat stat--tap" onClick={onOpenTop}><div className="stat__num">#{rank}</div><div className="stat__lbl">{t('stat_rank')}</div></button>
            <div className="stat"><div className="stat__num">{posts.length}</div><div className="stat__lbl">{t('stat_looks')}</div></div>
          </div>
          {posts.length > 0 ? (
            <div className="grid">
              {posts.map((p) => (
                <button className="grid__item" key={p.id}
                  style={{ backgroundImage: `url(${p.media_url})` }}
                  onClick={() => onOpenPost(p.id)}>
                  <span className="grid__score"><DripCoin size={11} /> {p.score}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="state">{t('no_looks')}</div>
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
      {reportOpen && <ReportModal targetId={userId} onClose={() => setReportOpen(false)} />}
    </div>
  )
}

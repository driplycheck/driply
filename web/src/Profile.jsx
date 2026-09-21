import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { ChevronLeft, Settings as SettingsIcon, Share, Grid3x3, Crown, Ban, Undo2, Flag } from 'lucide-react'
import { avatarTier, tierProgress } from './tiers.js'
import { shareRankCard } from './storyCard.js'
import Button from './components/ui/Button.jsx'
import { t, activeLang } from './i18n.js'
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

export default function Profile({ userId, selfId, onClose, onOpenSettings, onEditProfile, onOpenPost, onOpenProfile, onOpenArchive, onOpenVotes, onOpenTop, onFollowChanged }) {
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
  const [busyShare, setBusyShare] = useState(false)
  const [toast, setToast] = useState(null)

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

  async function share() {
    if (busyShare || !user) return
    setBusyShare(true)
    const res = await shareRankCard({ user, rank, postsCount: posts.length })
    setBusyShare(false)
    if (!res.ok) {
      setToast(res.reason === 'unsupported' ? t('share_unsupported') : t('share_failed'))
      setTimeout(() => setToast(null), 2200)
    }
  }

  function openPerson(id) {
    setListMode(null)
    if (id !== userId) onOpenProfile?.(id)
  }

  const isSelf = user && selfId && user.id === selfId
  const displayName = user?.display_name || (user?.username ? '@' + user.username : 'user')
  const showHandle = user?.username && (isSelf || !user.hide_username)
  const progress = tierProgress(user?.style_score ?? 0)
  const compact = (n) => Number(n || 0).toLocaleString(activeLang() === 'en' ? 'en-US' : 'ru-RU', { notation: n >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 })

  return (
    <div className="profile">
      {user?.avatar_url && <div className="profile__cover" style={{ backgroundImage: `url(${user.avatar_url})` }} aria-hidden="true" />}
      <header className="profile__top">
        <button className="profile__icon" onClick={onClose} aria-label={t('back')}>
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <div className="profile__topright">
          {isSelf && (
            <button className="profile__icon" onClick={onOpenSettings} aria-label={t('settings')}>
              <SettingsIcon size={20} strokeWidth={1.9} />
            </button>
          )}
          {user && !isSelf && (
            <>
              <button className={`profile__icon ${blocked ? 'profile__icon--on' : ''}`}
                onClick={() => setBlockState(!blocked)} disabled={busyBlock}
                aria-label={blocked ? t('unblock_user') : t('block_user')} title={blocked ? t('unblock_user') : t('block_user')}>
                {blocked ? <Undo2 size={19} strokeWidth={1.9} /> : <Ban size={19} strokeWidth={1.9} />}
              </button>
              <button className="profile__icon" onClick={() => setReportOpen(true)}
                aria-label={t('report')} title={t('report')}>
                <Flag size={18} strokeWidth={1.9} />
              </button>
            </>
          )}
        </div>
      </header>
      {loading ? (
        <div className="profile__state">{t('loading')}</div>
      ) : !user ? (
        <div className="profile__state">{t('profile_not_found')}</div>
      ) : (
        <div className="profile__body">
          <div className="profile__head">
            {user.avatar_url
              ? <img className={`profile__ava ${avatarTier(user.style_score)}`} src={user.avatar_url} alt="" />
              : <span className="profile__ava profile__ava--empty" />}
            <h1 className="profile__name">{displayName}</h1>
            {(showHandle || user.badge) && (
              <div className="profile__handle-row">
                {showHandle && <span className="profile__handle">@{user.username}</span>}
                {(user.badge === 'founder' || user.badge === 'cofounder') && (
                  <span className="profile__badge"><Crown size={11} strokeWidth={2.4} /> {t('badge_founder_short')}</span>
                )}
                {user.badge === 'first_drip' && (
                  <span className="profile__badge profile__badge--drip"><DripCoin size={11} /> {t('badge_first_drip')}</span>
                )}
              </div>
            )}
            {user.bio && <p className="profile__bio">{user.bio}</p>}
          </div>

          <div className="pstats">
            <div className="pstat"><b>{compact(posts.length)}</b><span>{t('stat_looks_short')}</span></div>
            <button className="pstat" onClick={() => setListMode('followers')}><b>{compact(followers)}</b><span>{t('stat_followers')}</span></button>
            <button className="pstat" onClick={() => setListMode('following')}><b>{compact(followingCount)}</b><span>{t('stat_following')}</span></button>
            <div className="pstat pstat--drip"><b>{compact(user.style_score)}</b><span>{t('stat_drips')}</span></div>
          </div>

          <button className="rankcard" onClick={onOpenTop}>
            <span className="rankcard__label">{t('rank_label')} · {t('rank_place', { n: rank })}</span>
            <span className="rankcard__row">
              <span className="rankcard__tier">{t('tier_' + progress.tier)}</span>
              <span className="rankcard__next">
                {progress.next ? t('rank_next', { tier: t('tier_to_' + progress.next), pct: progress.pct }) : t('rank_max')}
              </span>
            </span>
            <span className="rankcard__bar"><i style={{ width: progress.pct + '%' }} /></span>
          </button>

          <div className="profile__actions">
            {isSelf ? (
              <>
                <Button variant="secondary" onClick={onEditProfile}>{t('profile_edit')}</Button>
                <Button variant="primary" onClick={share} disabled={busyShare}>
                  <Share size={18} strokeWidth={2} /> {busyShare ? '…' : t('profile_share')}
                </Button>
              </>
            ) : (
              <Button variant={following ? 'secondary' : 'primary'} onClick={() => setFollowState(!following)} disabled={busyFollow}>
                {following ? t('unfollow') : t('follow')}
              </Button>
            )}
          </div>

          <nav className="ptabs">
            <span className="ptab ptab--on" aria-label={t('profile_looks_tab')}><Grid3x3 size={20} strokeWidth={1.9} /></span>
            {isSelf && <button className="ptab" onClick={onOpenArchive}>{t('archive_aria')}</button>}
            {isSelf && <button className="ptab" onClick={onOpenVotes}>{t('my_votes')}</button>}
          </nav>

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
            <div className="profile__state">{t('no_looks')}</div>
          )}
        </div>
      )}
      {toast && <div className="app-toast">{toast}</div>}

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

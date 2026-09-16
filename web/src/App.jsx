import { useEffect, useRef, useState } from 'react'
import { initTelegram } from './telegram.js'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'
import { loadLang, saveLang, setActiveLang } from './i18n.js'
import { loadSide, saveSide, setActiveSide } from './side.js'
import { useOverlayStack } from './useOverlayStack.js'
import Overlay from './ui/Overlay.jsx'
import Feed from './Feed.jsx'
import PostComposer from './PostComposer.jsx'
import Profile from './Profile.jsx'
import PostView from './PostView.jsx'
import Settings from './Settings.jsx'
import Search from './Search.jsx'
import Onboarding from './Onboarding.jsx'
import EditProfile from './EditProfile.jsx'
import PostsArchive from './PostsArchive.jsx'
import MyVotes from './MyVotes.jsx'
import TopUsers from './TopUsers.jsx'
import BlockedList from './BlockedList.jsx'
import Referral from './Referral.jsx'
import './composer.css'
import './profile.css'
import './onboarding.css'
import './settings.css'
import './search.css'
import './feed.css'

export default function App() {
  const [tgUser, setTgUser] = useState(null)
  const [profile, setProfile] = useState(undefined)
  const [lang, setLang] = useState(loadLang())
  const [side, setSide] = useState(loadSide())
  const [feedKey, setFeedKey] = useState(0)
  const [openFirstComposer, setOpenFirstComposer] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const { top, push, replace, pop, touch } = useOverlayStack()

  useEffect(() => {
    setActiveLang(lang)
  }, [lang])

  useEffect(() => {
    setActiveSide(side)
  }, [side])

  useEffect(() => {
    const u = initTelegram()
    setTgUser(u)
    if (!u?.id) { setProfile(null); return }
    loadProfile(u.id)
  }, [])

  async function loadProfile(telegramId) {
    const { data } = await supabase.rpc('my_profile', { p_tid: telegramId })
    setProfile(data?.display_name ? data : null)
  }

  useEffect(() => {
    if (!profile || !openFirstComposer) return
    setOpenFirstComposer(false)
    push('composer', { firstPost: true })
  }, [profile, openFirstComposer, push])

  function changeLang(code) { saveLang(code); setLang(code) }
  function changeSide(nextSide) { saveSide(nextSide); setSide(nextSide) }

  function flash(text) {
    setToast(text)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 2600)
  }

  // create_post возвращает награду и новый баланс — иначе пилюля висит со старым числом
  function onPosted(result) {
    pop()
    setFeedKey((k) => k + 1)
    touch('profile')
    if (result?.balance != null) {
      setProfile((p) => (p ? { ...p, daily_credits: result.balance } : p))
    }
    const gained = (result?.reward ?? 0) + (result?.ref_bonus ?? 0)
    if (gained > 0) flash(`+${gained} 💧 за образ`)
  }
  function onSaved(update) { setProfile((p) => ({ ...p, ...update })); pop(); touch('profile') }
  function onSettingsChanged(update) { setProfile((p) => ({ ...p, ...update })); touch('profile') }
  function onFollowChanged() { setFeedKey((k) => k + 1) }
  function onPostDeleted() { pop(); setFeedKey((k) => k + 1); touch('profile') }

  if (profile === undefined) return <div className="state">Загрузка…</div>

  if (profile === null && tgUser?.id) {
    return (
      <Onboarding
        tgUser={tgUser}
        onDone={() => {
          setOpenFirstComposer(true)
          loadProfile(tgUser.id)
        }}
      />
    )
  }

  return (
    <div className={`app side-${side}`}>
      <Feed
        key={feedKey}
        selfId={profile?.id ?? null}
        onOpenProfile={(id) => push('profile', { userId: id })}
        onPost={() => push('composer')}
      />

      <button className="search-btn" onClick={() => push('search')} aria-label="Поиск">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </button>

      {profile?.avatar_url && (
        <button
          className={`me ${avatarTier(profile.style_score)}`}
          onClick={() => push('profile', { userId: profile.id })}
          aria-label="Мой профиль"
        >
          <img src={profile.avatar_url} alt="" />
        </button>
      )}
      {profile && (
        <div className="balance-pill">💧 {profile.daily_credits ?? 0}</div>
      )}

      {toast && <div className="app-toast">{toast}</div>}

      {top?.type === 'search' && (
        <Overlay onClose={pop}>
          <Search
            onClose={pop}
            onOpenProfile={(id) => replace('profile', { userId: id })}
            onOpenPost={(id) => replace('postView', { postId: id })}
            onOpenTop={() => replace('top')}
          />
        </Overlay>
      )}

      {top?.type === 'composer' && (
        <Overlay onClose={pop}>
          <PostComposer onClose={pop} onPosted={onPosted} firstPost={top.props.firstPost} />
        </Overlay>
      )}

      {top?.type === 'profile' && (
        <Overlay key={top.key} onClose={pop}>
          <Profile
            userId={top.props.userId}
            selfId={profile?.id}
            onClose={pop}
            onOpenProfile={(id) => replace('profile', { userId: id })}
            onOpenSettings={() => push('settings')}
            onOpenArchive={() => push('archive')}
            onOpenVotes={() => push('votes')}
            onOpenTop={() => push('top')}
            onOpenPost={(id) => push('postView', { postId: id })}
            onFollowChanged={onFollowChanged}
          />
        </Overlay>
      )}

      {top?.type === 'settings' && profile && (
        <Overlay onClose={pop}>
          <Settings
            me={profile}
            lang={lang}
            onLang={changeLang}
            side={side}
            onSide={changeSide}
            onClose={pop}
            onEditProfile={() => push('editProfile')}
            onChanged={onSettingsChanged}
            onOpenBlocked={() => push('blocked')}
            onOpenReferral={() => push('referral')}
          />
        </Overlay>
      )}

      {top?.type === 'postView' && (
        <Overlay key={top.key} onClose={pop}>
          <PostView
            postId={top.props.postId}
            selfId={profile?.id}
            onClose={pop}
            onOpenProfile={(id) => replace('profile', { userId: id })}
            onPost={() => push('composer')}
            onChanged={onPostDeleted}
          />
        </Overlay>
      )}

      {top?.type === 'referral' && profile && (
        <Overlay onClose={pop}>
          <Referral me={profile} onClose={pop} />
        </Overlay>
      )}

      {top?.type === 'blocked' && (
        <Overlay onClose={pop}>
          <BlockedList onClose={pop} />
        </Overlay>
      )}

      {top?.type === 'archive' && (
        <Overlay onClose={pop}>
          <PostsArchive
            onClose={pop}
            onChanged={() => { setFeedKey((k) => k + 1); touch('profile') }}
          />
        </Overlay>
      )}

      {top?.type === 'top' && (
        <Overlay onClose={pop}>
          <TopUsers onClose={pop} onOpenProfile={(id) => replace('profile', { userId: id })} />
        </Overlay>
      )}

      {top?.type === 'votes' && (
        <Overlay onClose={pop}>
          <MyVotes onClose={pop} onOpenPost={(id) => replace('postView', { postId: id })} />
        </Overlay>
      )}

      {top?.type === 'editProfile' && profile && (
        <Overlay onClose={pop}>
          <EditProfile me={profile} onClose={pop} onSaved={onSaved} />
        </Overlay>
      )}
    </div>
  )
}

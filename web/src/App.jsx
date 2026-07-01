import { useEffect, useState } from 'react'
import { initTelegram } from './telegram.js'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'
import { loadLang, saveLang, setActiveLang } from './i18n.js'
import { loadSide, saveSide, setActiveSide } from './side.js'
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
  const [composerOpen, setComposerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [feedKey, setFeedKey] = useState(0)
  const [profileUserId, setProfileUserId] = useState(null)
  const [profileKey, setProfileKey] = useState(0)
  const [openPostId, setOpenPostId] = useState(null)
  const [archiveOpen, setArchiveOpen] = useState(false)
  const [votesOpen, setVotesOpen] = useState(false)
  const [blockedOpen, setBlockedOpen] = useState(false)
  const [referralOpen, setReferralOpen] = useState(false)

  setActiveLang(lang)
  setActiveSide(side)

  useEffect(() => {
    const u = initTelegram()
    setTgUser(u)
    if (!u?.id) { setProfile(null); return }
    supabase
      .from('users')
      .select('id, display_name, avatar_url, bio, style_score, hide_username, daily_credits, notify_follows, is_founder, gender, allow_dm, notify_prefs')
      .eq('telegram_id', u.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data?.display_name ? data : null)
      })
  }, [])

  function changeLang(code) { saveLang(code); setActiveLang(code); setLang(code) }
  function changeSide(s) { saveSide(s); setActiveSide(s); setSide(s) }

  function onPosted() { setComposerOpen(false); setFeedKey((k) => k + 1) }
  function onSaved(update) { setProfile((p) => ({ ...p, ...update })); setEditOpen(false); setProfileKey((k) => k + 1) }
  function onSettingsChanged(update) { setProfile((p) => ({ ...p, ...update })); setProfileKey((k) => k + 1) }
  function openProfileFromSearch(id) { setSearchOpen(false); setProfileUserId(id) }
  function openPostFromSearch(id) { setSearchOpen(false); setOpenPostId(id) }
  function onPostDeleted() { setOpenPostId(null); setFeedKey((k) => k + 1); setProfileKey((k) => k + 1) }

  // переход в чужой профиль из любого места: сначала закрываем текущий профиль,
  // потом открываем новый — без промежуточного показа своего
  function goProfile(id) {
    setProfileKey((k) => k + 1)
    setProfileUserId(id)
  }

  if (profile === undefined) return <div className="state">Загрузка…</div>

  if (profile === null && tgUser?.id) {
    return <Onboarding tgUser={tgUser} onDone={(p) => setProfile(p)} />
  }

  return (
    <div className={`app side-${side}`}>
      <Feed
        key={feedKey}
        selfId={profile?.id ?? null}
        onOpenProfile={setProfileUserId}
        onPost={() => setComposerOpen(true)}
      />

      <button className="search-btn" onClick={() => setSearchOpen(true)} aria-label="Поиск">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </button>

      {profile?.avatar_url && (
        <button
          className={`me ${avatarTier(profile.style_score)}`}
          onClick={() => setProfileUserId(profile.id)}
          aria-label="Мой профиль"
        >
          <img src={profile.avatar_url} alt="" />
        </button>
      )}
      {profile && (
        <div className="balance-pill">💧 {profile.daily_credits ?? 0}</div>
      )}

      {searchOpen && (
        <Search
          onClose={() => setSearchOpen(false)}
          onOpenProfile={openProfileFromSearch}
          onOpenPost={openPostFromSearch}
        />
      )}
      {composerOpen && (
        <PostComposer onClose={() => setComposerOpen(false)} onPosted={onPosted} gender={profile?.gender} />
      )}
      {profileUserId && (
        <Profile
          key={profileKey}
          userId={profileUserId}
          selfId={profile?.id}
          onClose={() => setProfileUserId(null)}
          onOpenProfile={goProfile}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenArchive={() => setArchiveOpen(true)}
          onOpenVotes={() => setVotesOpen(true)}
          onOpenPost={setOpenPostId}
          onFollowChanged={() => setFeedKey((k) => k + 1)}
        />
      )}
      {settingsOpen && profile && (
        <Settings
          me={profile}
          lang={lang}
          onLang={changeLang}
          side={side}
          onSide={changeSide}
          onClose={() => setSettingsOpen(false)}
          onEditProfile={() => setEditOpen(true)}
          onChanged={onSettingsChanged}
          onOpenBlocked={() => setBlockedOpen(true)}
          onOpenReferral={() => setReferralOpen(true)}
        />
      )}
      {openPostId && (
        <PostView
          postId={openPostId}
          selfId={profile?.id}
          onClose={() => setOpenPostId(null)}
          onOpenProfile={(id) => { setOpenPostId(null); setProfileUserId(id) }}
          onPost={() => setComposerOpen(true)}
          onDeleted={onPostDeleted}
        />
      )}
      {referralOpen && profile && (
        <Referral me={profile} onClose={() => setReferralOpen(false)} />
      )}
      {blockedOpen && (
        <BlockedList onClose={() => setBlockedOpen(false)} />
      )}
      {archiveOpen && (
        <PostsArchive
          onClose={() => setArchiveOpen(false)}
          onChanged={() => { setFeedKey((k) => k + 1); setProfileKey((k) => k + 1) }}
        />
      )}
      {votesOpen && (
        <MyVotes
          onClose={() => setVotesOpen(false)}
          onOpenPost={(id) => { setVotesOpen(false); setOpenPostId(id) }}
        />
      )}
      {editOpen && profile && (
        <EditProfile me={profile} onClose={() => setEditOpen(false)} onSaved={onSaved} />
      )}
    </div>
  )
}

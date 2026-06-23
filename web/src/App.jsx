import { useEffect, useState } from 'react'
import { initTelegram } from './telegram.js'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'
import Feed from './Feed.jsx'
import PostComposer from './PostComposer.jsx'
import Profile from './Profile.jsx'
import PostView from './PostView.jsx'
import Settings from './Settings.jsx'
import Search from './Search.jsx'
import Onboarding from './Onboarding.jsx'
import EditProfile from './EditProfile.jsx'
import './composer.css'
import './profile.css'
import './onboarding.css'
import './settings.css'
import './search.css'

export default function App() {
  const [tgUser, setTgUser] = useState(null)
  const [profile, setProfile] = useState(undefined)
  const [composerOpen, setComposerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [feedKey, setFeedKey] = useState(0)
  const [profileUserId, setProfileUserId] = useState(null)
  const [profileKey, setProfileKey] = useState(0)
  const [openPostId, setOpenPostId] = useState(null)

  useEffect(() => {
    const u = initTelegram()
    setTgUser(u)
    if (!u?.id) { setProfile(null); return }
    supabase
      .from('users')
      .select('id, display_name, avatar_url, bio, style_score, hide_username')
      .eq('telegram_id', u.id)
      .maybeSingle()
      .then(({ data }) => setProfile(data?.display_name ? data : null))
  }, [])

  function onPosted() {
    setComposerOpen(false)
    setFeedKey((k) => k + 1)
  }

  function onSaved(update) {
    setProfile((p) => ({ ...p, ...update }))
    setEditOpen(false)
    setProfileKey((k) => k + 1)
  }

  function onSettingsChanged(update) {
    setProfile((p) => ({ ...p, ...update }))
    setProfileKey((k) => k + 1)
  }

  function openProfileFromSearch(id) {
    setSearchOpen(false)
    setProfileUserId(id)
  }

  function openPostFromSearch(id) {
    setSearchOpen(false)
    setOpenPostId(id)
  }

  if (profile === undefined) return <div className="state">Загрузка…</div>

  if (profile === null && tgUser?.id) {
    return <Onboarding tgUser={tgUser} onDone={(p) => setProfile(p)} />
  }

  return (
    <>
      <Feed
        key={feedKey}
        tgId={tgUser?.id ?? null}
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

      {searchOpen && (
        <Search
          onClose={() => setSearchOpen(false)}
          onOpenProfile={openProfileFromSearch}
          onOpenPost={openPostFromSearch}
        />
      )}
      {composerOpen && (
        <PostComposer onClose={() => setComposerOpen(false)} onPosted={onPosted} />
      )}
      {profileUserId && (
        <Profile
          key={profileKey}
          userId={profileUserId}
          selfId={profile?.id}
          onClose={() => setProfileUserId(null)}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenPost={setOpenPostId}
        />
      )}
      {settingsOpen && profile && (
        <Settings
          me={profile}
          onClose={() => setSettingsOpen(false)}
          onEditProfile={() => setEditOpen(true)}
          onChanged={onSettingsChanged}
        />
      )}
      {openPostId && (
        <PostView
          postId={openPostId}
          onClose={() => setOpenPostId(null)}
          onOpenProfile={(id) => { setOpenPostId(null); setProfileUserId(id) }}
          onPost={() => setComposerOpen(true)}
        />
      )}
      {editOpen && profile && (
        <EditProfile me={profile} onClose={() => setEditOpen(false)} onSaved={onSaved} />
      )}
    </>
  )
}

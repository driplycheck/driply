import { useEffect, useState } from 'react'
import { initTelegram } from './telegram.js'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'
import Feed from './Feed.jsx'
import PostComposer from './PostComposer.jsx'
import Profile from './Profile.jsx'
import Onboarding from './Onboarding.jsx'
import EditProfile from './EditProfile.jsx'
import './composer.css'
import './profile.css'
import './onboarding.css'

export default function App() {
  const [tgUser, setTgUser] = useState(null)
  const [profile, setProfile] = useState(undefined)
  const [composerOpen, setComposerOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [feedKey, setFeedKey] = useState(0)
  const [profileUserId, setProfileUserId] = useState(null)
  const [profileKey, setProfileKey] = useState(0)

  useEffect(() => {
    const u = initTelegram()
    setTgUser(u)
    if (!u?.id) {
      setProfile(null)
      return
    }
    supabase
      .from('users')
      .select('id, display_name, avatar_url, bio, style_score')
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

  if (profile === undefined) return <div className="state">Загрузка…</div>

  if (profile === null && tgUser?.id) {
    return <Onboarding tgUser={tgUser} onDone={(p) => setProfile(p)} />
  }

  return (
    <>
      <Feed key={feedKey} tgId={tgUser?.id ?? null} onOpenProfile={setProfileUserId} />

      {profile?.avatar_url && (
        <button
          className={`me ${avatarTier(profile.style_score)}`}
          onClick={() => setProfileUserId(profile.id)}
          aria-label="Мой профиль"
        >
          <img src={profile.avatar_url} alt="" />
        </button>
      )}

      <button className="drip-btn" onClick={() => setComposerOpen(true)} aria-label="Выложить образ">
        +
      </button>

      {composerOpen && (
        <PostComposer onClose={() => setComposerOpen(false)} onPosted={onPosted} />
      )}
      {profileUserId && (
        <Profile
          key={profileKey}
          userId={profileUserId}
          selfId={profile?.id}
          onClose={() => setProfileUserId(null)}
          onEdit={() => setEditOpen(true)}
        />
      )}
      {editOpen && profile && (
        <EditProfile me={profile} onClose={() => setEditOpen(false)} onSaved={onSaved} />
      )}
    </>
  )
}

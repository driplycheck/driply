import { useEffect, useRef, useState } from 'react'
import { initTelegram } from './telegram.js'
import { readPrivate } from './api.js'
import { t, loadLang, saveLang, setActiveLang } from './i18n.js'
import { track } from './analytics.js'
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
import Appearance from './Appearance.jsx'
import Moderation from './Moderation.jsx'
import Support from './Support.jsx'
import { setToastListener } from './toast.js'
import TabBar from './components/ui/TabBar.jsx'
import DripCoin from './components/ui/DripCoin.jsx'
import { useTheme } from './theme/ThemeProvider.jsx'
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
  const [feedKey, setFeedKey] = useState(0)
  const [scrollTopKey, setScrollTopKey] = useState(0)
  const [openFirstComposer, setOpenFirstComposer] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  const { top, push, replace, pop, touch } = useOverlayStack()
  const { allowPreview } = useTheme()

  useEffect(() => {
    setActiveLang(lang)
  }, [lang])


  useEffect(() => {
    const u = initTelegram()
    setTgUser(u)
    if (!u?.id) { setProfile(null); return }
    loadProfile().then((known) => track('app_open', { known }))
  }, [])

  // telegram_id больше не нужен: quick-handler берёт его из подписанной initData
  async function loadProfile() {
    const data = await readPrivate('my_profile')
    const known = !!data?.display_name
    setProfile(known ? data : null)
    return known
  }

  // темы в предпросмотре: пока экраны не перекрашены, их видят только фаундеры
  const isFounder = profile ? !!profile.is_founder : null
  useEffect(() => {
    if (isFounder !== null) allowPreview(isFounder)
  }, [isFounder, allowPreview])

  useEffect(() => {
    if (!profile || !openFirstComposer) return
    setOpenFirstComposer(false)
    push('composer', { firstPost: true })
  }, [profile, openFirstComposer, push])

  // setActiveLang до setLang: иначе перерисовка успевает пройти на старом языке
  function changeLang(code) { saveLang(code); setActiveLang(code); setLang(code) }
  // любое действие может показать ошибку, не пробрасывая пропсы через пол-приложения
  useEffect(() => { setToastListener(flash); return () => setToastListener(null) }, [])

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
    touch('archive')   // после правки список своих образов обязан показать новые данные
    if (result?.balance != null) {
      setProfile((p) => (p ? { ...p, daily_credits: result.balance } : p))
    }
    const gained = (result?.reward ?? 0) + (result?.ref_bonus ?? 0)
    if (gained > 0) flash(<><DripCoin size={15} tone="ink" /> {t('reward_toast', { n: gained })}</>)
  }
  function onSaved(update) { setProfile((p) => ({ ...p, ...update })); pop(); touch('profile') }
  function onSettingsChanged(update) { setProfile((p) => ({ ...p, ...update })); touch('profile') }
  function onFollowChanged() { setFeedKey((k) => k + 1) }
  function onPostDeleted() { pop(); setFeedKey((k) => k + 1); touch('profile') }

  if (profile === undefined) return <div className="state">{t('loading')}</div>

  if (profile === null && tgUser?.id) {
    return (
      <Onboarding
        tgUser={tgUser}
        onDone={() => {
          setOpenFirstComposer(true)
          loadProfile()
        }}
      />
    )
  }

  return (
    <div className="app">
      <Feed
        key={feedKey}
        selfId={profile?.id ?? null}
        balance={profile ? (profile.daily_credits ?? 0) : null}
        scrollTopKey={scrollTopKey}
        onOpenProfile={(id) => push('profile', { userId: id })}
        onBalance={(n) => setProfile((p) => (p ? { ...p, daily_credits: n } : p))}
      />

      <div className="tabbar-fade" aria-hidden="true" />
      <TabBar
        active="home"
        onHome={() => setScrollTopKey((k) => k + 1)}
        onSearch={() => push('search')}
        onCreate={() => push('composer')}
        onTop={() => push('top')}
        onProfile={() => profile?.id && push('profile', { userId: profile.id })}
      />

      {toast && <div className="app-toast">{toast}</div>}

      {top?.type === 'search' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <Search
            onClose={pop}
            onOpenProfile={(id) => replace('profile', { userId: id })}
            onOpenPost={(id) => replace('postView', { postId: id })}
            onOpenTop={() => replace('top')}
          />
        </Overlay>
      )}

      {top?.type === 'composer' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <PostComposer
            selfId={profile?.id}
            onClose={pop}
            onPosted={onPosted}
            firstPost={top.props.firstPost}
            editPost={top.props.editPost}
          />
        </Overlay>
      )}

      {top?.type === 'profile' && (
        <Overlay key={top.key} onClose={pop} leaving={top.leaving}>
          <Profile
            userId={top.props.userId}
            selfId={profile?.id}
            onClose={pop}
            onOpenProfile={(id) => replace('profile', { userId: id })}
            onOpenSettings={() => push('settings')}
            onEditProfile={() => push('editProfile')}
            onOpenReferral={() => push('referral')}
            onOpenArchive={() => push('archive')}
            onOpenVotes={() => push('votes')}
            onOpenTop={() => push('top')}
            onOpenPost={(id) => push('postView', { postId: id })}
            onFollowChanged={onFollowChanged}
          />
        </Overlay>
      )}

      {top?.type === 'settings' && profile && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <Settings
            me={profile}
            lang={lang}
            onLang={changeLang}
            onClose={pop}
            onEditProfile={() => push('editProfile')}
            onChanged={onSettingsChanged}
            onOpenBlocked={() => push('blocked')}
            onOpenReferral={() => push('referral')}
            onOpenAppearance={() => push('appearance')}
            onOpenModeration={() => push('moderation')}
            onOpenSupport={() => push('support')}
          />
        </Overlay>
      )}

      {top?.type === 'postView' && (
        <Overlay key={top.key} onClose={pop} leaving={top.leaving}>
          <PostView
            postId={top.props.postId}
            selfId={profile?.id}
            onClose={pop}
            onOpenProfile={(id) => replace('profile', { userId: id })}
            onChanged={onPostDeleted}
            onBalance={(n) => setProfile((p) => (p ? { ...p, daily_credits: n } : p))}
          />
        </Overlay>
      )}

      {top?.type === 'support' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <Support onClose={pop} />
        </Overlay>
      )}

      {top?.type === 'moderation' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <Moderation onClose={pop} onChanged={() => setFeedKey((k) => k + 1)} />
        </Overlay>
      )}

      {top?.type === 'appearance' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <Appearance onClose={pop} />
        </Overlay>
      )}

      {top?.type === 'referral' && profile && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <Referral me={profile} onClose={pop} />
        </Overlay>
      )}

      {top?.type === 'blocked' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <BlockedList onClose={pop} />
        </Overlay>
      )}

      {top?.type === 'archive' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <PostsArchive
            onClose={pop}
            onChanged={() => { setFeedKey((k) => k + 1); touch('profile') }}
            onEdit={(post) => push('composer', { editPost: post })}
          />
        </Overlay>
      )}

      {top?.type === 'top' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <TopUsers me={profile} onClose={pop} onOpenProfile={(id) => replace('profile', { userId: id })} />
        </Overlay>
      )}

      {top?.type === 'votes' && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <MyVotes onClose={pop} onOpenPost={(id) => replace('postView', { postId: id })} />
        </Overlay>
      )}

      {top?.type === 'editProfile' && profile && (
        <Overlay onClose={pop} leaving={top.leaving}>
          <EditProfile me={profile} onClose={pop} onSaved={onSaved} />
        </Overlay>
      )}
    </div>
  )
}

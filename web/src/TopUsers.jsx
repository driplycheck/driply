import { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'
import { t } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'
import './leaderboard.css'

function nameOf(u) {
  return u.display_name || '@' + (u.username || 'user')
}

function Avatar({ user, size }) {
  const [broken, setBroken] = useState(false)
  return user.avatar_url && !broken
    ? <img onError={() => setBroken(true)} className={`lb-ava ${avatarTier(user.style_score)}`} src={user.avatar_url} alt="" style={{ width: size, height: size }} />
    : <span className="lb-ava lb-ava--empty" style={{ width: size, height: size }}>{nameOf(user).replace('@', '').slice(0, 1).toUpperCase()}</span>
}

function Score({ value }) {
  return <span className="lb-score"><DripCoin size={14} /> {Number(value || 0).toLocaleString('ru-RU')}</span>
}

// порядок 2 · 1 · 3, первое место выше
function Podium({ users, selfId, onOpen }) {
  const order = [users[1], users[0], users[2]].filter(Boolean)
  return (
    <div className="podium">
      {order.map((u) => (
        <button key={u.id} className={`podium__col podium__col--${u.rank} ${u.id === selfId ? 'is-self' : ''}`}
          onClick={() => onOpen(u.id)}>
          <span className="podium__ava">
            <Avatar user={u} size={u.rank === 1 ? 76 : 60} />
            <span className="podium__place">{u.rank}</span>
          </span>
          <span className="podium__name">{nameOf(u)}</span>
          <Score value={u.style_score} />
          <span className="podium__step">{u.rank}</span>
        </button>
      ))}
    </div>
  )
}

export default function TopUsers({ selfId, onClose, onOpenProfile }) {
  const [users, setUsers] = useState(null)

  useEffect(() => {
    let active = true
    supabase.rpc('top_users', { p_limit: 50, p_offset: 0 })
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('top_users', error); setUsers([]); return }
        setUsers(data || [])
      })
    return () => { active = false }
  }, [])

  const podium = users && users.length >= 3 ? users.slice(0, 3) : []
  const rest = users ? users.slice(podium.length) : []

  return (
    <div className="lb">
      <header className="lb__top">
        <button className="lb__back" onClick={onClose} aria-label={t('back')}><ChevronLeft size={22} strokeWidth={2} /></button>
      </header>
      <div className="lb__body">
        <h1 className="lb__title">{t('leaderboard')}</h1>
        <p className="lb__sub">{t('leaderboard_sub')}</p>

        {!users ? (
          <div className="lb__state">{t('loading')}</div>
        ) : users.length === 0 ? (
          <div className="lb__state">{t('rating_empty')}</div>
        ) : (
          <>
            {podium.length > 0 && <Podium users={podium} selfId={selfId} onOpen={onOpenProfile} />}
            <div className="lb__list">
              {rest.map((u) => (
                <button key={u.id} className={`lrow ${u.id === selfId ? 'lrow--self' : ''}`} onClick={() => onOpenProfile(u.id)}>
                  <span className="lrow__rank">{u.rank}</span>
                  <Avatar user={u} size={44} />
                  <span className="lrow__name">
                    {nameOf(u)}
                    {u.id === selfId && <span className="lrow__you">{t('you')}</span>}
                  </span>
                  <Score value={u.style_score} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

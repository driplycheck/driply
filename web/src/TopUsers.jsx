import { useEffect, useState } from 'react'
import { ChevronLeft, Crown, ArrowRight, X } from 'lucide-react'
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
            {u.rank === 1 && <Crown className="podium__crown" size={22} strokeWidth={2.2} />}
            <Avatar user={u} size={u.rank === 1 ? 84 : 62} />
          </span>
          <span className="podium__name">{nameOf(u)}</span>
          <span className="podium__step">
            <b>{u.rank}</b>
            <span>{Number(u.style_score || 0).toLocaleString('ru-RU')}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

const EARN = [
  ['earn_start', 200], ['earn_first', 300], ['earn_next', 100],
  ['earn_ref', 500], ['earn_story', 200],
]

function EarnSheet({ onClose }) {
  return (
    <div className="earn" onClick={onClose}>
      <div className="earn__box" onClick={(e) => e.stopPropagation()}>
        <div className="earn__head">
          <h2>{t('earn_title')}</h2>
          <button className="earn__close" onClick={onClose} aria-label={t('close_aria')}><X size={18} strokeWidth={2.2} /></button>
        </div>
        {EARN.map(([key, n]) => (
          <div className="earn__row" key={key}>
            <span>{t(key)}</span>
            <b><DripCoin size={14} /> +{n}</b>
          </div>
        ))}
        <p className="earn__note">{t('earn_vote_note')}</p>
      </div>
    </div>
  )
}

export default function TopUsers({ me, onClose, onOpenProfile }) {
  const selfId = me?.id
  const [earnOpen, setEarnOpen] = useState(false)
  const [myRank, setMyRank] = useState(null)
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

  // своё место, даже если ты не в топ-50: сколько людей с очками выше
  useEffect(() => {
    if (me?.style_score == null) return
    let active = true
    supabase.from('users').select('id', { count: 'exact', head: true }).gt('style_score', me.style_score)
      .then(({ count, error }) => { if (active && !error) setMyRank((count ?? 0) + 1) })
    return () => { active = false }
  }, [me?.style_score])

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
            {me && (
              <div className="mydrips">
                <span className="mydrips__label">{t('your_drips')}</span>
                <span className="mydrips__row">
                  <span className="mydrips__num"><DripCoin size={30} tone="ink" /> {Number(me.daily_credits ?? 0).toLocaleString('ru-RU')}</span>
                  <button className="mydrips__how" onClick={() => setEarnOpen(true)}>
                    {t('how_to_earn')} <ArrowRight size={14} strokeWidth={2.4} />
                  </button>
                </span>
              </div>
            )}
            <div className="lb__list">
              {rest.map((u) => (
                <button key={u.id} className={`lrow ${u.id === selfId ? 'lrow--self' : ''}`} onClick={() => onOpenProfile(u.id)}>
                  <span className="lrow__rank">{u.rank}</span>
                  <Avatar user={u} size={44} />
                  <span className="lrow__name">{nameOf(u)}</span>
                  <Score value={u.style_score} />
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      {me && myRank && (
        <button className="lrow lrow--pinned" onClick={() => onOpenProfile(me.id)}>
          <span className="lrow__rank">{myRank}</span>
          <Avatar user={me} size={40} />
          <span className="lrow__name">{t('you')} · {nameOf(me)}</span>
          <Score value={me.style_score} />
        </button>
      )}
      {earnOpen && <EarnSheet onClose={() => setEarnOpen(false)} />}
    </div>
  )
}

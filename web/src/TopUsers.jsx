import { useEffect, useState } from 'react'
import { ChevronLeft, Crown, ArrowRight, X, ArrowUp, ArrowDown } from 'lucide-react'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'
import { t, plural, styleName } from './i18n.js'
import { tg } from './telegram.js'
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

const PERIODS = ['week', 'month', 'all']

// «2 д 14 ч» / «5 ч 20 мин» до сброса периода
function resetIn(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (!Number.isFinite(ms) || ms <= 0) return null
  const min = Math.floor(ms / 60000)
  const d = Math.floor(min / 1440)
  const h = Math.floor((min % 1440) / 60)
  return d > 0 ? t('left_dh', { d, h }) : t('left_hm', { h, m: min % 60 })
}

function Delta({ value }) {
  if (!value) return null
  const up = value > 0
  return (
    <span className={`lb-delta ${up ? 'lb-delta--up' : 'lb-delta--down'}`}>
      {up ? <ArrowUp size={11} strokeWidth={3} /> : <ArrowDown size={11} strokeWidth={3} />}
      {Math.abs(value)}
    </span>
  )
}

export default function TopUsers({ me, onClose, onOpenProfile }) {
  const selfId = me?.id
  const [period, setPeriod] = useState('week')
  const [board, setBoard] = useState(null)
  const [earnOpen, setEarnOpen] = useState(false)

  useEffect(() => {
    let active = true
    setBoard(null)
    const tid = tg?.initDataUnsafe?.user?.id ?? 0
    supabase.rpc('leaderboard', { p_period: period, p_tid: tid, p_limit: 50 })
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('leaderboard', error); setBoard({ items: [], me: null }); return }
        setBoard(data || { items: [], me: null })
      })
    return () => { active = false }
  }, [period])

  const users = board?.items ?? null
  const mine = board?.me ?? null
  const podium = users && users.length >= 3 ? users.slice(0, 3) : []
  const rest = users ? users.slice(podium.length) : []
  const left = board?.reset_at ? resetIn(board.reset_at) : null

  return (
    <div className="lb">
      <header className="lb__top">
        <button className="lb__back" onClick={onClose} aria-label={t('back')}><ChevronLeft size={22} strokeWidth={2} /></button>
      </header>
      <div className="lb__body">
        <h1 className="lb__title">{t('leaderboard')}</h1>
        <p className="lb__sub">
          {t('period_' + period)}{left ? ' · ' + t('reset_in', { t: left }) : ' · ' + t('leaderboard_sub_all')}
        </p>

        <div className="lb-seg" role="tablist">
          {PERIODS.map((id) => (
            <button key={id} role="tab" aria-selected={period === id}
              className={`lb-seg__opt ${period === id ? 'lb-seg__opt--on' : ''}`} onClick={() => setPeriod(id)}>
              {t('period_' + id)}
            </button>
          ))}
        </div>

        {!users ? (
          <div className="lb__state">{t('loading')}</div>
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
            {users.length === 0 ? (
              <div className="lb__state">{t('period_empty')}</div>
            ) : (
              <div className="lb__list">
                {rest.map((u) => (
                  <button key={u.id} className={`lrow ${u.id === selfId ? 'lrow--self' : ''}`} onClick={() => onOpenProfile(u.id)}>
                    <span className="lrow__rank">{u.rank}</span>
                    <Avatar user={u} size={44} />
                    <span className="lrow__who">
                      <span className="lrow__name">{nameOf(u)}</span>
                      {u.style && <span className="lrow__style">{styleName(u.style)}</span>}
                    </span>
                    <Delta value={u.rank_delta} />
                    <Score value={u.style_score} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {me && mine && (
        <button className="lrow lrow--pinned" onClick={() => onOpenProfile(me.id)}>
          <span className="lrow__rank">{mine.rank ?? '—'}</span>
          <Avatar user={me} size={40} />
          <span className="lrow__who">
            <span className="lrow__name">{t('you')} · {nameOf(me)}</span>
            <span className="lrow__style lrow__style--me">
              {!mine.rank ? t('no_points_period')
                : [
                    mine.today > 0 && t('today_plus', { n: mine.today }),
                    mine.rank_delta > 0 && t('places_up', { n: mine.rank_delta, w: plural(mine.rank_delta, 'place') }),
                    mine.rank_delta < 0 && t('places_down', { n: -mine.rank_delta, w: plural(-mine.rank_delta, 'place') }),
                  ].filter(Boolean).join(' · ') || t('rank_steady')}
            </span>
          </span>
          <Score value={mine.score} />
        </button>
      )}
      {earnOpen && <EarnSheet onClose={() => setEarnOpen(false)} />}
    </div>
  )
}

import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'

const CATEGORY_ICON = { top: '👕', bottoms: '👖', shoes: '👟', accessory: '🧢', other: '✨' }
const AMOUNTS = [10, 50, 100]
const ERRORS = {
  ALREADY_VOTED: 'Ты уже оценил этот образ',
  NOT_ENOUGH_CREDITS: 'Не хватает дрипов',
  CANNOT_VOTE_OWN: 'Нельзя голосовать за свой образ',
  AUTH_FAILED: 'Не удалось подтвердить вход',
}

function DripMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 3c3.6 5.2 6 8.2 6 11.6A6 6 0 0 1 6 14.6C6 11.2 8.4 8.2 12 3z" fill="#2a1d00" />
    </svg>
  )
}

function PlusMark() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

async function castVote(postId, amount) {
  const { data, error } = await supabase.functions.invoke('quick-handler', {
    body: { initData: getInitData(), post_id: postId, amount },
  })
  if (!error) return { ok: true, ...data }
  try {
    const ctx = await error.context.json()
    return { ok: false, code: ctx.error }
  } catch {
    return { ok: false, code: 'UNKNOWN' }
  }
}

export default function PostCard({ post, alreadyVoted, onOpenProfile, onPost }) {
  const author = post.users || {}
  const items = (post.post_items || []).map((pi) => pi.items).filter(Boolean)
  const authorName = author.display_name || '@' + (author.username || 'user')

  const [score, setScore] = useState(post.score)
  const [votedLocal, setVotedLocal] = useState(false)
  const voted = votedLocal || alreadyVoted
  const [picking, setPicking] = useState(false)
  const [showItems, setShowItems] = useState(false)
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [drips, setDrips] = useState([])

  function flash(msg) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  async function vote(amount) {
    if (busy || voted) return
    setPicking(false)
    setBusy(true)
    const res = await castVote(post.id, amount)
    setBusy(false)
    if (res.ok) {
      setScore(res.new_score)
      setVotedLocal(true)
      const id = Date.now()
      setDrips((d) => [...d, { id, amount }])
      setTimeout(() => setDrips((d) => d.filter((x) => x.id !== id)), 900)
      flash(`Осталось ${res.remaining_credits} дрипов`)
    } else {
      if (res.code === 'ALREADY_VOTED') setVotedLocal(true)
      flash(ERRORS[res.code] || 'Не получилось, попробуй ещё раз')
    }
  }

  function onCoin() {
    if (voted) return flash('Уже оценил')
    setPicking((p) => !p)
  }

  function openProfile() {
    if (author.id) onOpenProfile(author.id)
  }

  return (
    <section className="card" style={{ '--img': `url(${post.media_url})` }}>
      <div className="card__bg" />
      <div className="card__scrim" />

      <header className="card__top">
        <span className="badge">★ {author.style_score ?? 0}</span>
      </header>

      <div className="card__bottom">
        <div className="author" onClick={openProfile} style={{ cursor: 'pointer' }}>
          {author.avatar_url && (
            <img className={`author__ava ${avatarTier(author.style_score)}`} src={author.avatar_url} alt="" />
          )}
          <span className="author__name">{authorName}</span>
        </div>
        {post.caption && <p className="caption">{post.caption}</p>}
        {showItems && items.length > 0 && (
          <div className="tags">
            {items.map((it, idx) => (
              <span className="tag" key={idx}>
                {CATEGORY_ICON[it.category] || '✨'} {it.brand} {it.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="menu">
        <button className="menu__btn menu__btn--post" onClick={onPost} aria-label="Выложить образ">
          <PlusMark />
        </button>
        {items.length > 0 && (
          <button
            className={`menu__btn ${showItems ? 'menu__btn--on' : ''}`}
            onClick={() => setShowItems((s) => !s)}
            aria-label="Вещи на фото"
          >🏷️</button>
        )}
        <div className="votewrap">
          {picking && !voted && (
            <div className="picker">
              {AMOUNTS.map((a) => (
                <button key={a} className="picker__opt" onClick={() => vote(a)}>+{a}</button>
              ))}
            </div>
          )}
          <button
            className={`vote ${voted ? 'vote--done' : ''}`}
            disabled={busy}
            onClick={onCoin}
            aria-label="Оценить образ"
          >
            <span className="vote__coin">{voted ? '✓' : busy ? '…' : <DripMark />}</span>
            {drips.map((d) => (
              <span className="drip" key={d.id}>+{d.amount}</span>
            ))}
          </button>
          <span className="vote__score">★ {score}</span>
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </section>
  )
}

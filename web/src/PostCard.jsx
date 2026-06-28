import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'

const CATEGORY_ICON = {
  top: '👕', bottoms: '👖', shoes: '👟', accessory: '🧢',
  dress: '👗', skirt: '👚', bag: '👜', other: '✨',
}

const AMOUNTS = [10, 50, 100]

const ERRORS = {
  ALREADY_VOTED: 'Ты уже оценил этот образ',
  NOT_ENOUGH_CREDITS: 'Не хватает кредитов',
  CANNOT_VOTE_OWN: 'Нельзя голосовать за свой образ',
  AUTH_FAILED: 'Не удалось подтвердить вход',
}

function DripMark({ size = 22, color = '#1a1300' }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path d="M12 2.5c4.2 5 6.5 8.2 6.5 11.3A6.5 6.5 0 0 1 12 20.3a6.5 6.5 0 0 1-6.5-6.5C5.5 10.7 7.8 7.5 12 2.5z"
        fill={color} />
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
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState(null)
  const [drips, setDrips] = useState([])
  const [showItems, setShowItems] = useState(false)

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
      flash(`Осталось ${res.remaining_credits} кредитов`)
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
    if (author.id) onOpenProfile?.(author.id)
  }

  return (
    <section className="card" style={{ '--img': `url(${post.media_url})` }}>
      <div className="card__bg" />
      <div className="card__scrim" />

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

      <div className="rail">
        <button className="railic" onClick={() => onPost?.()} aria-label="Выложить образ">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>

        {items.length > 0 && (
          <button
            className={`railic ${showItems ? 'railic--on' : ''}`}
            onClick={() => setShowItems((s) => !s)}
            aria-label="Вещи на образе"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 4a2 2 0 0 0-1 3.7L12 9l1-1.3A2 2 0 0 0 12 4z" />
              <path d="M12 9c-1 1.5-7 4.5-8.5 6.5C2 17 3 19 5 19h14c2 0 3-2 1.5-3.5C19 13.5 13 10.5 12 9z" />
            </svg>
          </button>
        )}

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
          <span className="vote__coin">
            {voted ? '✓' : busy ? '…' : <DripMark size={22} color="#1a1300" />}
          </span>
          {drips.map((d) => (
            <span className="drip" key={d.id}>+{d.amount}</span>
          ))}
        </button>
        <span className="vote__score">
          <DripMark size={13} color="#f4c430" /> {score}
        </span>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </section>
  )
}

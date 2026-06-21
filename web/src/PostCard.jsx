import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

const CATEGORY_ICON = {
  top: '👕',
  bottoms: '👖',
  shoes: '👟',
  accessory: '🧢',
  other: '✨',
}

const AMOUNTS = [10, 50, 100]

const ERRORS = {
  ALREADY_VOTED: 'Уже голосовал за этот образ',
  NOT_ENOUGH_CREDITS: 'Не хватает кредитов',
  CANNOT_VOTE_OWN: 'Нельзя голосовать за свой образ',
  AUTH_FAILED: 'Не удалось подтвердить вход',
  NO_BOT_TOKEN: 'Сервер не настроен (BOT_TOKEN)',
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
    return { ok: false, code: 'NETWORK' }
  }
}

export default function PostCard({ post }) {
  const author = post.users || {}
  const items = (post.post_items || []).map((pi) => pi.items).filter(Boolean)

  const [score, setScore] = useState(post.score)
  const [voted, setVoted] = useState(false)
  const [picking, setPicking] = useState(false)
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
      setVoted(true)
      const id = Date.now()
      setDrips((d) => [...d, { id, amount }])
      setTimeout(() => setDrips((d) => d.filter((x) => x.id !== id)), 900)
      flash(`Осталось ${res.remaining_credits} кредитов`)
    } else {
      if (res.code === 'ALREADY_VOTED') setVoted(true)
      flash(ERRORS[res.code] || 'Что-то пошло не так')
    }
  }

  function onCoin() {
    if (voted) return flash('Уже голосовал')
    setPicking((p) => !p)
  }

  return (
    <section className="card" style={{ '--img': `url(${post.media_url})` }}>
      <div className="card__bg" />
      <div className="card__scrim" />

      <header className="card__top">
        <span className="badge">★ {author.style_score ?? 0}</span>
      </header>

      <div className="card__bottom">
        <div className="author">
          {author.avatar_url && (
            <img className="author__ava" src={author.avatar_url} alt="" />
          )}
          <span className="author__name">@{author.username}</span>
        </div>
        {post.caption && <p className="caption">{post.caption}</p>}
        {items.length > 0 && (
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
        {picking && !voted && (
          <div className="picker">
            {AMOUNTS.map((a) => (
              <button key={a} className="picker__opt" onClick={() => vote(a)}>
                +{a}
              </button>
            ))}
          </div>
        )}
        <button
          className={`vote ${voted ? 'vote--done' : ''}`}
          disabled={busy}
          onClick={onCoin}
          aria-label="Оценить образ"
        >
          <span className="vote__coin">{voted ? '✓' : busy ? '…' : '◉'}</span>
          {drips.map((d) => (
            <span className="drip" key={d.id}>+{d.amount}</span>
          ))}
        </button>
        <span className="vote__score">{score}</span>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </section>
  )
}

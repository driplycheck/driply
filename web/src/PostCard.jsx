import { useState } from 'react'

const CATEGORY_ICON = {
  top: '👕',
  bottoms: '👖',
  shoes: '👟',
  accessory: '🧢',
  other: '✨',
}

export default function PostCard({ post }) {
  const author = post.users || {}
  const items = (post.post_items || []).map((pi) => pi.items).filter(Boolean)

  const [score, setScore] = useState(post.score)
  const [drips, setDrips] = useState([])

  function vote() {
    setScore((s) => s + 10)
    const id = Date.now() + Math.random()
    setDrips((d) => [...d, id])
    setTimeout(() => setDrips((d) => d.filter((x) => x !== id)), 900)
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
        <button className="vote" onClick={vote} aria-label="Оценить образ">
          <span className="vote__coin">◉</span>
          {drips.map((id) => (
            <span className="drip" key={id}>+10</span>
          ))}
        </button>
        <span className="vote__score">{score}</span>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'
import ReportModal from './ReportModal.jsx'
import { t } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'

const CATEGORY_ICON = {
  top: '👕',
  bottoms: '👖',
  shoes: '👟',
  accessory: '🧢',
  dress: '👗',
  skirt: '👚',
  bag: '👜',
  other: '✨',
}

const AMOUNTS = [10, 50, 100]

const ERROR_KEYS = {
  ALREADY_VOTED: 'already_voted',
  NOT_ENOUGH_CREDITS: 'not_enough_credits',
  CANNOT_VOTE_OWN: 'cannot_vote_own',
  AUTH_FAILED: 'auth_failed',
}

function getItems(post) {
  return (post.post_items || []).map((postItem) => postItem.items).filter(Boolean)
}

function getAuthorName(author) {
  return author.display_name || '@' + (author.username || 'user')
}

async function castVote(postId, amount) {
  const { data, error } = await supabase.functions.invoke('quick-handler', {
    body: { action: 'cast_vote', initData: getInitData(), post_id: postId, amount },
  })
  if (!error) return { ok: true, ...data }
  try {
    const ctx = await error.context.json()
    return { ok: false, code: ctx.error }
  } catch {
    return { ok: false, code: 'UNKNOWN' }
  }
}

function CardContent({ post, author, authorName, items, showItems, onOpenProfile }) {
  return (
    <div className="card__bottom">
      <div className="author" onClick={onOpenProfile} style={{ cursor: 'pointer' }}>
        {author.avatar_url && (
          <img className={`author__ava ${avatarTier(author.style_score)}`} src={author.avatar_url} alt="" />
        )}
        <span className="author__name">{authorName}</span>
      </div>
      {post.caption && <p className="caption">{post.caption}</p>}
      {post.style && (
        <div className="card__style">
          <span className="stylebadge">{post.style.emoji} {post.style.name_ru}</span>
        </div>
      )}
      {showItems && items.length > 0 && (
        <div className="tags">
          {items.map((item, index) => (
            <span className="tag" key={index}>
              {CATEGORY_ICON[item.category] || '✨'} {item.brand} {item.name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function ItemsIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4a2 2 0 0 0-1 3.7L12 9l1-1.3A2 2 0 0 0 12 4z" />
      <path d="M12 9c-1 1.5-7 4.5-8.5 6.5C2 17 3 19 5 19h14c2 0 3-2 1.5-3.5C19 13.5 13 10.5 12 9z" />
    </svg>
  )
}

function RailButton({ label, active = false, onClick, children }) {
  return (
    <button className={`railic ${active ? 'railic--on' : ''}`} onClick={onClick} aria-label={label}>
      {children}
    </button>
  )
}

function VoteControl({ score, voted, busy, picking, drips, onVote, onCoin }) {
  return (
    <>
      {picking && !voted && (
        <div className="picker">
          {AMOUNTS.map((amount) => (
            <button key={amount} className="picker__opt" onClick={() => onVote(amount)}>
              +{amount}
            </button>
          ))}
        </div>
      )}
      <button className={`vote ${voted ? 'vote--done' : ''}`} disabled={busy} onClick={onCoin} aria-label={t('vote_aria')}>
        <span className="vote__coin">
          {voted ? '✓' : busy ? '…' : <DripCoin size={26} tone="ink" />}
        </span>
        {drips.map((drip) => <span className="drip" key={drip.id}>+{drip.amount}</span>)}
      </button>
      <span className="vote__score"><DripCoin size={14} /> {score}</span>
    </>
  )
}

function CardRail({ hasItems, showItems, onToggleItems, onPost, onReport, ...voteProps }) {
  return (
    <div className="rail">
      {onReport && <RailButton label={t('report')} onClick={onReport}>🚩</RailButton>}
      <RailButton label={t('post_look')} onClick={onPost}><PlusIcon /></RailButton>
      {hasItems && (
        <RailButton label={t('items_aria')} active={showItems} onClick={onToggleItems}>
          <ItemsIcon />
        </RailButton>
      )}
      <VoteControl {...voteProps} />
    </div>
  )
}

export default function PostCard({ post, alreadyVoted, onOpenProfile, onPost, selfId, onReported }) {
  const [reportOpen, setReportOpen] = useState(false)
  const author = post.users || {}
  const items = getItems(post)
  const authorName = getAuthorName(author)

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
      flash(t('credits_left', { n: res.remaining_credits }))
    } else {
      if (res.code === 'ALREADY_VOTED') setVotedLocal(true)
      flash(ERROR_KEYS[res.code] ? t(ERROR_KEYS[res.code]) : t('retry_failed'))
    }
  }

  function onCoin() {
    if (voted) return flash(t('already_voted_short'))
    setPicking((p) => !p)
  }

  const openProfile = () => author.id && onOpenProfile?.(author.id)
  const reportPost = selfId && post.user_id !== selfId && post.users?.id !== selfId

  return (
    <section className="card" style={{ '--img': `url(${post.media_url})` }}>
      <div className="card__bg" />
      <div className="card__scrim" />

      <CardContent
        post={post}
        author={author}
        authorName={authorName}
        items={items}
        showItems={showItems}
        onOpenProfile={openProfile}
      />
      <CardRail
        hasItems={items.length > 0}
        showItems={showItems}
        onToggleItems={() => setShowItems((visible) => !visible)}
        onPost={onPost}
        onReport={reportPost ? () => setReportOpen(true) : null}
        score={score}
        voted={voted}
        busy={busy}
        picking={picking}
        drips={drips}
        onVote={vote}
        onCoin={onCoin}
      />

      {toast && <div className="toast">{toast}</div>}
      {reportOpen && <ReportModal postId={post.id} onClose={() => setReportOpen(false)} onReported={onReported} />}
    </section>
  )
}

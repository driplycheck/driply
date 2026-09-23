import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData, haptic } from './telegram.js'
import { avatarTier } from './tiers.js'
import ReportModal from './ReportModal.jsx'
import { Flag, Shirt, Check } from 'lucide-react'
import { t, styleName, timeAgo } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'
import OutfitCard from './components/ui/OutfitCard.jsx'
import GlassBadge from './components/ui/GlassBadge.jsx'
import { CategoryIcon, StyleIcon } from './components/ui/Icon.jsx'
import Button from './components/ui/Button.jsx'

const AMOUNTS = [10, 50, 100]

const ERROR_KEYS = {
  ALREADY_VOTED: 'already_voted',
  NOT_ENOUGH_CREDITS: 'not_enough_credits',
  CANNOT_VOTE_OWN: 'cannot_vote_own',
  AUTH_FAILED: 'auth_failed',
}

function getItems(post) {
  return (post.post_items || [])
    .filter((postItem) => postItem.items)
    .map((postItem) => ({ ...postItem.items, price: postItem.price ?? null }))
}

function formatPrice(n) {
  return Number(n).toLocaleString('ru-RU') + ' ₽'
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

function DripControl({ voted, busy, picking, drips, onVote, onOpen }) {
  return (
    <div className="dripctl">
      {picking && !voted && (
        <div className="dripctl__picker">
          {AMOUNTS.map((amount) => (
            <button key={amount} className="dripctl__opt" onClick={() => onVote(amount)}>
              <DripCoin size={14} tone="ink" /> +{amount}
            </button>
          ))}
        </div>
      )}
      {voted ? (
        <Button variant="secondary" className="dripctl__done" onClick={onOpen}>
          <Check size={16} strokeWidth={2.6} /> {t('dripped')}
        </Button>
      ) : (
        <Button variant="drip" disabled={busy} onClick={onOpen} aria-label={t('vote_aria')}
          aria-expanded={picking}>
          {busy ? '…' : t('drip_it')}
        </Button>
      )}
      {drips.map((drip) => <span className="dripctl__float" key={drip.id}>+{drip.amount}</span>)}
    </div>
  )
}

function IconAction({ label, active = false, onClick, children }) {
  return (
    <button className={`ocard__icon ${active ? 'ocard__icon--on' : ''}`} onClick={onClick} aria-label={label}
      aria-pressed={active}>
      {children}
    </button>
  )
}

export default function PostCard({ post, alreadyVoted, onOpenProfile, selfId, onReported, priority = false }) {
  const [reportOpen, setReportOpen] = useState(false)
  const author = post.users || {}
  const items = getItems(post)
  const style = post.style || post.styles || null
  const style2 = post.style2 || null
  const images = [post.media_url, ...(post.extra_media || [])]

  const [score, setScore] = useState(post.score)
  const [votedLocal, setVotedLocal] = useState(false)
  const voted = votedLocal || alreadyVoted || !!post.voted
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
      haptic('medium')
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

  function onOpenDrip() {
    if (voted) return flash(t('already_voted_short'))
    setPicking((p) => !p)
  }

  const openProfile = () => author.id && onOpenProfile?.(author.id)
  const canReport = selfId && post.user_id !== selfId && post.users?.id !== selfId

  return (
    <OutfitCard
      images={images}
      priority={priority}
      badge={style && (
        <>
          <GlassBadge><StyleIcon slug={style.slug} size={13} /> {styleName(style)}</GlassBadge>
          {style2 && <GlassBadge><StyleIcon slug={style2.slug} size={13} /> {styleName(style2)}</GlassBadge>}
        </>
      )}
      author={{
        name: getAuthorName(author),
        avatarUrl: author.avatar_url,
        tierClass: avatarTier(author.style_score),
        meta: post.created_at ? timeAgo(post.created_at) : null,
        onClick: openProfile,
      }}
      caption={post.caption}
      tags={showItems && items.length > 0 && (
        <div className="ocard__tags">
          {items.map((item, index) => (
            <span className="ocard__tag" key={index}>
              <CategoryIcon category={item.category} size={14} /> {item.brand} {item.name}
              {item.price != null && <b className="ocard__price">{formatPrice(item.price)}</b>}
            </span>
          ))}
        </div>
      )}
      actions={
        <>
          <span className="ocard__score" aria-label={t('look_score', { n: score })}>
            <DripCoin size={20} /> {score}
          </span>
          {items.length > 0 && (
            <IconAction label={t('items_aria')} active={showItems} onClick={() => setShowItems((v) => !v)}>
              <Shirt size={22} strokeWidth={1.9} />
            </IconAction>
          )}
          {canReport && (
            <IconAction label={t('report')} onClick={() => setReportOpen(true)}>
              <Flag size={20} strokeWidth={1.9} />
            </IconAction>
          )}
          <span className="ocard__spacer" />
          <DripControl
            voted={voted}
            busy={busy}
            picking={picking}
            drips={drips}
            onVote={vote}
            onOpen={onOpenDrip}
          />
        </>
      }
    >
      {toast && <div className="ocard__toast">{toast}</div>}
      {reportOpen && <ReportModal postId={post.id} onClose={() => setReportOpen(false)} onReported={onReported} />}
    </OutfitCard>
  )
}

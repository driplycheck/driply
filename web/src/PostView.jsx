import { useEffect, useState } from 'react'
import { callOrToast } from './api.js'
import { supabase } from './supabase.js'
import PostCard from './PostCard.jsx'
import { t } from './i18n.js'

const SELECT =
  'id, media_url, extra_media, caption, score, user_id, hidden, created_at, ' +
  'users(id, username, display_name, avatar_url, style_score), ' +
  'post_items(price, items(name, brand, category)), ' +
  'style2:styles!posts_style2_id_fkey(id, slug, name_ru, name_en), ' +
  // явная связь: у posts будет второй FK на styles, без подсказки PostgREST не выберет
  'style:styles!posts_style_id_fkey(id, slug, name_ru, name_en)'

export default function PostView({ postId, selfId, onClose, onOpenProfile, onChanged, onBalance }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)
  const [voted, setVoted] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('posts').select(SELECT).eq('id', postId).maybeSingle()
      .then(({ data }) => { if (active) { setPost(data); setLoading(false) } })
    return () => { active = false }
  }, [postId])

  useEffect(() => {
    if (!selfId) return
    let active = true
    supabase.from('votes').select('post_id').eq('voter_id', selfId).eq('post_id', postId).maybeSingle()
      .then(({ data }) => { if (active) setVoted(!!data) })
    return () => { active = false }
  }, [postId, selfId])

  const isOwn = post && selfId && (post.user_id === selfId || post.users?.id === selfId)

  async function hide() {
    if (busy) return
    setBusy(true)
    const res = await callOrToast('set_post_hidden', { post_id: postId, hidden: true })
    setBusy(false)
    setConfirm(false)
    if (!res.ok) return
    onChanged?.(postId)
  }

  return (
    <div className="postview">
      <button className="postview__close" onClick={onClose} aria-label={t('close_aria')}>✕</button>
      {isOwn && (
        <button className="postview__del" onClick={() => setConfirm(true)} aria-label={t('hide_look_aria')}>🙈</button>
      )}
      {loading ? (
        <div className="state">{t('loading')}</div>
      ) : !post ? (
        <div className="state">{t('post_not_found')}</div>
      ) : (
        <PostCard post={post} alreadyVoted={voted} selfId={selfId} onOpenProfile={onOpenProfile} onBalance={onBalance} />
      )}
      {confirm && (
        <div className="confirm">
          <div className="confirm__box">
            <div className="confirm__title">{t('hide_confirm')}</div>
            <div className="confirm__hint">{t('hide_confirm_hint')}</div>
            <div className="confirm__row">
              <button className="confirm__no" onClick={() => setConfirm(false)} disabled={busy}>{t('cancel')}</button>
              <button className="confirm__yes" onClick={hide} disabled={busy}>{busy ? '…' : t('hide')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

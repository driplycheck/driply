import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import PostCard from './PostCard.jsx'

const SELECT =
  'id, media_url, caption, score, user_id, ' +
  'users(id, username, display_name, avatar_url, style_score), ' +
  'post_items(items(name, brand, category))'

export default function PostView({ postId, selfId, onClose, onOpenProfile, onPost, onDeleted }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('posts').select(SELECT).eq('id', postId).maybeSingle()
      .then(({ data }) => { if (active) { setPost(data); setLoading(false) } })
    return () => { active = false }
  }, [postId])

  const isOwn = post && selfId && (post.user_id === selfId || post.users?.id === selfId)

  async function del() {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'delete_post', initData: getInitData(), post_id: postId },
    })
    setBusy(false)
    if (error) { setConfirm(false); return }
    onDeleted?.(postId)
  }

  return (
    <div className="postview">
      <button className="postview__close" onClick={onClose} aria-label="Закрыть">✕</button>
      {isOwn && (
        <button className="postview__del" onClick={() => setConfirm(true)} aria-label="Удалить образ">🗑</button>
      )}
      {loading ? (
        <div className="state">Загрузка…</div>
      ) : !post ? (
        <div className="state">Пост не найден</div>
      ) : (
        <PostCard post={post} alreadyVoted={false} onOpenProfile={onOpenProfile} onPost={onPost} />
      )}
      {confirm && (
        <div className="confirm">
          <div className="confirm__box">
            <div className="confirm__title">Удалить образ?</div>
            <div className="confirm__row">
              <button className="confirm__no" onClick={() => setConfirm(false)} disabled={busy}>Отмена</button>
              <button className="confirm__yes" onClick={del} disabled={busy}>{busy ? '…' : 'Удалить'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

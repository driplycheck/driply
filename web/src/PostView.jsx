import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import PostCard from './PostCard.jsx'

const SELECT =
  'id, media_url, caption, score, user_id, hidden, ' +
  'users(id, username, display_name, avatar_url, style_score), ' +
  'post_items(items(name, brand, category)), ' +
  'styles(name_ru, name_en, emoji)'

const REASONS = [
  { key: 'nsfw', label: 'Откровенный контент' },
  { key: 'harassment', label: 'Оскорбление / травля' },
  { key: 'spam', label: 'Спам или реклама' },
  { key: 'not_outfit', label: 'Не образ / не по теме' },
  { key: 'other', label: 'Другое' },
]

export default function PostView({ postId, selfId, onClose, onOpenProfile, onPost, onChanged }) {
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [confirm, setConfirm] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reported, setReported] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    supabase.from('posts').select(SELECT).eq('id', postId).maybeSingle()
      .then(({ data }) => { if (active) { setPost(data); setLoading(false) } })
    return () => { active = false }
  }, [postId])

  const isOwn = post && selfId && (post.user_id === selfId || post.users?.id === selfId)

  async function hide() {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_post_hidden', initData: getInitData(), post_id: postId, hidden: true },
    })
    setBusy(false)
    setConfirm(false)
    if (error) return
    onChanged?.(postId)
  }

  async function report(reason) {
    if (busy) return
    setBusy(true)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'report', initData: getInitData(), post_id: postId, reason },
    })
    setBusy(false)
    setReportOpen(false)
    if (!error) setReported(true)
  }

  return (
    <div className="postview">
      <button className="postview__close" onClick={onClose} aria-label="Закрыть">✕</button>
      {isOwn && (
        <button className="postview__del" onClick={() => setConfirm(true)} aria-label="Скрыть образ">🙈</button>
      )}
      {!isOwn && post && !reported && (
        <button className="postview__del" onClick={() => setReportOpen(true)} aria-label="Пожаловаться">🚩</button>
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
            <div className="confirm__title">Скрыть образ из ленты?</div>
            <div className="confirm__hint">Очки сохранятся. Вернуть можно из истории публикаций.</div>
            <div className="confirm__row">
              <button className="confirm__no" onClick={() => setConfirm(false)} disabled={busy}>Отмена</button>
              <button className="confirm__yes" onClick={hide} disabled={busy}>{busy ? '…' : 'Скрыть'}</button>
            </div>
          </div>
        </div>
      )}
      {reportOpen && (
        <div className="confirm">
          <div className="confirm__box">
            <div className="confirm__title">Пожаловаться на образ</div>
            <div className="confirm__hint">Выбери причину — мы проверим.</div>
            {REASONS.map((r) => (
              <button
                key={r.key}
                className="confirm__no"
                style={{ width: '100%', marginTop: 8 }}
                onClick={() => report(r.key)}
                disabled={busy}
              >
                {r.label}
              </button>
            ))}
            <div className="confirm__row">
              <button className="confirm__no" onClick={() => setReportOpen(false)} disabled={busy}>Отмена</button>
            </div>
          </div>
        </div>
      )}
      {reported && (
        <div className="confirm" onClick={() => setReported(false)}>
          <div className="confirm__box">
            <div className="confirm__title">Жалоба отправлена</div>
            <div className="confirm__hint">Спасибо, мы проверим этот образ.</div>
          </div>
        </div>
      )}
    </div>
  )
}

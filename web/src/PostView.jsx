import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import PostCard from './PostCard.jsx'

const SELECT =
  'id, media_url, caption, score, ' +
  'users(id, username, display_name, avatar_url, style_score), ' +
  'post_items(items(name, brand, category))'

export default function PostView({ postId, onClose, onOpenProfile, onPost }) {
  const [post, setPost] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    supabase
      .from('posts')
      .select(SELECT)
      .eq('id', postId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active) return
        if (error) setError(error.message)
        else setPost(data)
      })
    return () => { active = false }
  }, [postId])

  return (
    <div className="postview">
      <button className="postview__close" onClick={onClose} aria-label="Закрыть">✕</button>
      {error ? (
        <div className="state">Не удалось открыть пост</div>
      ) : !post ? (
        <div className="state">Загрузка…</div>
      ) : (
        <PostCard post={post} alreadyVoted={false} onOpenProfile={onOpenProfile} onPost={onPost} />
      )}
    </div>
  )
}

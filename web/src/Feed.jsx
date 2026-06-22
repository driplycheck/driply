import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import PostCard from './PostCard.jsx'

const SELECT =
  'id, media_url, caption, score, ' +
  'users(id, username, display_name, avatar_url, style_score), ' +
  'post_items(items(name, brand, category))'

export default function Feed({ tgId, onOpenProfile }) {
  const [posts, setPosts] = useState(null)
  const [votedIds, setVotedIds] = useState(new Set())
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase
      .from('posts')
      .select(SELECT)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setPosts(data)
      })
  }, [])

  useEffect(() => {
    if (!tgId) return
    let active = true
    ;(async () => {
      const { data: u } = await supabase
        .from('users')
        .select('id')
        .eq('telegram_id', tgId)
        .maybeSingle()
      if (!u || !active) return
      const { data: v } = await supabase
        .from('votes')
        .select('post_id')
        .eq('voter_id', u.id)
      if (v && active) setVotedIds(new Set(v.map((r) => r.post_id)))
    })()
    return () => {
      active = false
    }
  }, [tgId])

  if (error) return <div className="state">Лента не загрузилась. {error}</div>
  if (!posts) return <div className="state">Загружаем ленту…</div>
  if (posts.length === 0)
    return <div className="state">Пока пусто. Первый образ — за тобой.</div>

  return (
    <div className="feed">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          alreadyVoted={votedIds.has(post.id)}
          onOpenProfile={onOpenProfile}
        />
      ))}
    </div>
  )
}

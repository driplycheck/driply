import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import PostCard from './PostCard.jsx'

const SELECT =
  'id, media_url, caption, score, ' +
  'users(username, avatar_url, style_score), ' +
  'post_items(items(name, brand, category))'

export default function Feed() {
  const [posts, setPosts] = useState(null)
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

  if (error) return <div className="state">Лента не загрузилась. {error}</div>
  if (!posts) return <div className="state">Загружаем ленту…</div>
  if (posts.length === 0)
    return <div className="state">Пока пусто. Первый образ — за тобой.</div>

  return (
    <div className="feed">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}

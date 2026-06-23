import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import PostCard from './PostCard.jsx'

const SELECT =
  'id, media_url, caption, score, ' +
  'users(id, username, display_name, avatar_url, style_score), ' +
  'post_items(items(name, brand, category))'

export default function Feed({ selfId, onOpenProfile, onPost }) {
  const [tab, setTab] = useState('all')
  const [posts, setPosts] = useState(null)
  const [votedIds, setVotedIds] = useState(new Set())
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!selfId) return
    let active = true
    supabase.from('votes').select('post_id').eq('voter_id', selfId)
      .then(({ data }) => { if (data && active) setVotedIds(new Set(data.map((r) => r.post_id))) })
    return () => { active = false }
  }, [selfId])

  useEffect(() => {
    let active = true
    setPosts(null)
    setError(null)
    ;(async () => {
      if (tab === 'following') {
        if (!selfId) { if (active) setPosts([]); return }
        const { data: fl } = await supabase
          .from('follows').select('following_id').eq('follower_id', selfId)
        const ids = (fl || []).map((r) => r.following_id)
        if (ids.length === 0) { if (active) setPosts([]); return }
        const { data, error } = await supabase
          .from('posts').select(SELECT)
          .in('user_id', ids)
          .order('created_at', { ascending: false })
        if (!active) return
        if (error) setError(error.message); else setPosts(data)
        return
      }
      const { data, error } = await supabase
        .from('posts').select(SELECT)
        .order('created_at', { ascending: false })
      if (!active) return
      if (error) setError(error.message); else setPosts(data)
    })()
    return () => { active = false }
  }, [tab, selfId])

  return (
    <>
      <div className="feed-tabs">
        <button className={`feed-tab ${tab === 'all' ? 'feed-tab--on' : ''}`} onClick={() => setTab('all')}>Все</button>
        <button className={`feed-tab ${tab === 'following' ? 'feed-tab--on' : ''}`} onClick={() => setTab('following')}>Подписки</button>
      </div>

      {error ? (
        <div className="state">Лента не загрузилась. {error}</div>
      ) : !posts ? (
        <div className="state">Загружаем ленту…</div>
      ) : posts.length === 0 ? (
        <div className="state">
          {tab === 'following'
            ? 'Пока пусто. Подпишись на кого-нибудь через поиск — их образы появятся здесь.'
            : 'Пока пусто. Первый образ — за тобой.'}
        </div>
      ) : (
        <div className="feed">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              alreadyVoted={votedIds.has(post.id)}
              onOpenProfile={onOpenProfile}
              onPost={onPost}
            />
          ))}
        </div>
      )}
    </>
  )
}

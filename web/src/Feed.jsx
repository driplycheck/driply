import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { t, styleName } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'
import Chip from './components/ui/Chip.jsx'
import PostCard from './PostCard.jsx'
import { usePager } from './usePager.js'

export default function Feed({ selfId, balance, scrollTopKey, onOpenProfile }) {
  const [tab, setTab] = useState('all')
  const [posts, setPosts] = useState(null)
  const [votedIds, setVotedIds] = useState(new Set())
  const [error, setError] = useState(null)
  const [styleId, setStyleId] = useState(null)
  const scroller = useRef(null)
  usePager(scroller, '.feed-list > .ocard', [])

  // повторный тап по «Ленте» в таб-баре — наверх
  useEffect(() => {
    if (scrollTopKey) scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [scrollTopKey])

  useEffect(() => {
    if (!selfId) return
    let active = true
    supabase.from('votes').select('post_id').eq('voter_id', selfId)
      .then(({ data, error }) => {
        if (!active) return
        if (error) { console.error('votes load', error); return }
        setVotedIds(new Set((data || []).map((r) => r.post_id)))
      })
    return () => { active = false }
  }, [selfId])

  useEffect(() => {
    let active = true
    setPosts(null)
    setError(null)
    setStyleId(null)
    ;(async () => {
      if (tab === 'following') {
        if (!selfId) { if (active) setPosts([]); return }
        const { data, error } = await supabase.rpc('following_feed', { p_uid: selfId })
        if (!active) return
        if (error) { setError(error.message); setPosts([]) }
        else setPosts(Array.isArray(data) ? data : [])
        return
      }
      const { data, error } = await supabase.rpc('main_feed', { p_uid: selfId ?? 0 })
      if (!active) return
      if (error) { setError(error.message); setPosts([]) }
      else setPosts(Array.isArray(data) ? data : [])
    })()
    return () => { active = false }
  }, [tab, selfId])

  // чипы — только стили, которые реально есть в ленте: пустой фильтр хуже, чем никакого
  const styles = useMemo(() => {
    const seen = new Map()
    for (const p of posts || []) if (p.style && !seen.has(p.style.id)) seen.set(p.style.id, p.style)
    return [...seen.values()]
  }, [posts])
  const visible = styleId ? (posts || []).filter((p) => p.style?.id === styleId) : posts

  return (
    <div className="feed" ref={scroller}>
      <header className="feed-head">
        <span className="logo">driply<i className="logo__dot" /></span>
        {balance != null && (
          <span className="feed-balance" aria-label={t('balance_aria', { n: balance })}>
            <DripCoin size={20} /> {Number(balance).toLocaleString('ru-RU')}
          </span>
        )}
      </header>

      <nav className="feed-tabs" role="tablist">
        {['all', 'following'].map((id) => (
          <button key={id} role="tab" aria-selected={tab === id}
            className={`feed-tab ${tab === id ? 'feed-tab--on' : ''}`} onClick={() => setTab(id)}>
            {t(id === 'all' ? 'tab_all' : 'tab_following')}
          </button>
        ))}
      </nav>

      {tab === 'all' && styles.length > 1 && (
        <div className="feed-chips">
          <Chip active={!styleId} onClick={() => setStyleId(null)}>{t('chip_all')}</Chip>
          {styles.map((s) => (
            <Chip key={s.id} active={styleId === s.id} onClick={() => setStyleId(s.id)}>{styleName(s)}</Chip>
          ))}
        </div>
      )}

      {error ? (
        <div className="feed-state">{t('feed_error')} {error}</div>
      ) : !posts ? (
        <div className="feed-list">
          <div className="feed-skeleton" /><div className="feed-skeleton" />
        </div>
      ) : visible.length === 0 ? (
        <div className="feed-state">
          {tab === 'following' ? t('feed_empty_following') : t('feed_empty_all')}
        </div>
      ) : (
        <div className="feed-list">
          {visible.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              alreadyVoted={votedIds.has(post.id)}
              selfId={selfId}
              onReported={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))}
              onOpenProfile={onOpenProfile}
            />
          ))}
        </div>
      )}
    </div>
  )
}

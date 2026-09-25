import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { t, styleName } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'
import Chip from './components/ui/Chip.jsx'
import PostCard from './PostCard.jsx'
import { SlidersHorizontal } from 'lucide-react'
import { usePager } from './usePager.js'

export default function Feed({ selfId, balance, scrollTopKey, onOpenProfile, onBalance }) {
  const [tab, setTab] = useState('all')
  const [posts, setPosts] = useState(null)
  const [votedIds, setVotedIds] = useState(new Set())
  const [error, setError] = useState(null)
  const [styleId, setStyleId] = useState(null)
  const [filterOpen, setFilterOpen] = useState(false)
  const scroller = useRef(null)
  // лента уже загруженной вкладки показывается сразу, обновление идёт фоном
  const cache = useRef({})
  usePager(scroller, '.feed-slot', [])

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
    setError(null)
    setStyleId(null)
    setPosts(cache.current[tab] ?? null)
    ;(async () => {
      if (tab === 'following' && !selfId) { if (active) setPosts([]); return }
      const { data, error } = tab === 'following'
        ? await supabase.rpc('following_feed', { p_uid: selfId })
        : await supabase.rpc('main_feed', { p_uid: selfId ?? 0 })
      if (!active) return
      if (error) {
        // молча оставляем показанный кэш: моргать ошибкой поверх готовой ленты незачем
        if (!cache.current[tab]) { setError(error.message); setPosts([]) }
        return
      }
      const list = Array.isArray(data) ? data : []
      cache.current[tab] = list
      setPosts(list)
    })()
    return () => { active = false }
  }, [tab, selfId])

  // чипы — только стили, которые реально есть в ленте: пустой фильтр хуже, чем никакого
  const styles = useMemo(() => {
    const seen = new Map()
    for (const p of posts || []) {
      for (const st of [p.style, p.style2]) if (st && !seen.has(st.id)) seen.set(st.id, st)
    }
    return [...seen.values()]
  }, [posts])
  const visible = styleId ? (posts || []).filter((p) => p.style?.id === styleId || p.style2?.id === styleId) : posts

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
        {/* фильтр свёрнут в одну кнопку: ряд стилей занимал полосу экрана у каждого образа */}
        {tab === 'all' && styles.length > 1 && (
          <button
            className={`feed-filter ${styleId ? 'feed-filter--on' : ''}`}
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            <SlidersHorizontal size={14} strokeWidth={2.2} />
            {styleId ? styleName(styles.find((s) => s.id === styleId) ?? {}) : t('chip_all')}
          </button>
        )}
      </nav>

      {filterOpen && tab === 'all' && styles.length > 1 && (
        <div className="feed-chips">
          <Chip active={!styleId} onClick={() => { setStyleId(null); setFilterOpen(false) }}>{t('chip_all')}</Chip>
          {styles.map((s) => (
            <Chip key={s.id} active={styleId === s.id} onClick={() => { setStyleId(s.id); setFilterOpen(false) }}>{styleName(s)}</Chip>
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
          {visible.map((post, i) => (
            <div className="feed-slot" key={post.id}>
              <PostCard
                priority={i === 0}
                post={post}
                alreadyVoted={votedIds.has(post.id)}
                selfId={selfId}
                onReported={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))}
                onOpenProfile={onOpenProfile}
                onBalance={onBalance}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

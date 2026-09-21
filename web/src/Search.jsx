import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import { avatarTier } from './tiers.js'
import { t, styleName } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'

function PostGrid({ posts, onOpenPost }) {
  return (
    <div className="grid">
      {posts.map((post) => (
        <button
          className="grid__item"
          key={post.id}
          style={{ backgroundImage: `url(${post.media_url})` }}
          onClick={() => onOpenPost(post.id)}
        >
          <span className="grid__score"><DripCoin size={11} /> {post.score}</span>
        </button>
      ))}
    </div>
  )
}

export default function Search({ onClose, onOpenProfile, onOpenPost, onOpenTop }) {
  const [q, setQ] = useState('')
  const [people, setPeople] = useState([])
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [itemView, setItemView] = useState(null) // { label, posts }
  const [styles, setStyles] = useState([])

  useEffect(() => {
    let active = true
    supabase.from('styles')
      .select('id, name_ru, name_en, emoji')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => { if (active) setStyles(data || []) })
    return () => { active = false }
  }, [])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) { setPeople([]); setItems([]); return }
    let active = true
    setLoading(true)
    const like = `%${term}%`
    const t = setTimeout(async () => {
      const [pu, it] = await Promise.all([
        supabase.rpc('search_people', { p_uid: 0, p_q: term }),
        supabase.from('items')
          .select('id, name, brand, category')
          .or(`name.ilike.${like},brand.ilike.${like}`).limit(20),
      ])
      if (!active) return
      setPeople(pu.data || [])
      setItems(it.data || [])
      setLoading(false)
    }, 250)
    return () => { active = false; clearTimeout(t) }
  }, [q])

  async function openItem(it) {
    const label = `${it.brand || ''} ${it.name || ''}`.trim()
    setItemView({ label, posts: null })
    const { data } = await supabase
      .from('post_items')
      .select('posts(id, media_url, score)')
      .eq('item_id', it.id)
    const posts = (data || []).map((r) => r.posts).filter(Boolean)
    setItemView({ label, posts })
  }

  async function openStyle(s) {
    const label = `${s.emoji || ''} ${styleName(s)}`.trim()
    setItemView({ label, posts: null })
    const { data } = await supabase.rpc('posts_by_style', { p_uid: 0, p_style_id: s.id })
    setItemView({ label, posts: data || [] })
  }

  if (itemView) {
    return (
      <div className="search">
        <header className="search__top">
          <button className="search__close" onClick={() => setItemView(null)}>{t('back')}</button>
          <span className="search__title">{itemView.label}</span>
          <span className="search__spacer" />
        </header>
        <div className="search__body">
          {!itemView.posts ? (
            <div className="state">{t('loading')}</div>
          ) : itemView.posts.length === 0 ? (
            <div className="state">{t('no_looks_in_style')}</div>
          ) : (
            <PostGrid posts={itemView.posts} onOpenPost={onOpenPost} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="search">
      <header className="search__top">
        <button className="search__close" onClick={onClose}>{t('back')}</button>
        <input
          className="search__input field"
          placeholder={t('search_placeholder')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
        />
      </header>
      <div className="search__body">
        {q.trim().length < 2 ? (
          <>
            <div className="ssection">
              <div className="ssection__h">{t('sec_rating')}</div>
              <button className="sresult" onClick={onOpenTop}>
                <div className="sresult__icon">🏆</div>
                <div className="sresult__text">
                  <div className="sresult__name">{t('top_style')}</div>
                  <div className="sresult__sub">{t('top_style_sub')}</div>
                </div>
              </button>
            </div>
            {styles.length > 0 && (
              <div className="ssection">
                <div className="ssection__h">{t('sec_styles')}</div>
                <div className="stylegrid">
                  {styles.map((s) => (
                    <button className="stylecard" key={s.id} onClick={() => openStyle(s)}>
                      <span className="stylecard__emoji">{s.emoji}</span>
                      <span className="stylecard__name">{styleName(s)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="state">{t('search_hint')}</div>
          </>
        ) : loading ? (
          <div className="state">{t('searching')}</div>
        ) : (
          <>
            {people.length > 0 && (
              <div className="ssection">
                <div className="ssection__h">{t('sec_people')}</div>
                {people.map((u) => (
                  <button className="sresult" key={u.id} onClick={() => onOpenProfile(u.id)}>
                    {u.avatar_url && (
                      <img className={`sresult__ava ${avatarTier(u.style_score)}`} src={u.avatar_url} alt="" />
                    )}
                    <div className="sresult__text">
                      <div className="sresult__name">{u.display_name || '@' + (u.username || 'user')}</div>
                      {u.username && !u.hide_username && (
                        <div className="sresult__sub">@{u.username}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {items.length > 0 && (
              <div className="ssection">
                <div className="ssection__h">{t('sec_items')}</div>
                {items.map((it) => (
                  <button className="sresult" key={it.id} onClick={() => openItem(it)}>
                    <div className="sresult__icon">🔖</div>
                    <div className="sresult__text">
                      <div className="sresult__name">{it.brand} {it.name}</div>
                      <div className="sresult__sub">{it.category}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {people.length === 0 && items.length === 0 && (
              <div className="state">{t('nothing_found')}</div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

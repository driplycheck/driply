import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import './MyVotes.css'

function tgId() {
  return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? 0
}

export default function MyVotes({ onClose }) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data, error } = await supabase.rpc('my_votes', { p_tid: tgId() })
      if (!active) return
      if (error) console.error('my_votes', error)
      setVotes(data || [])
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  return (
    <div className="myvotes">
      <div className="myvotes__head">
        <button className="myvotes__back" onClick={onClose} aria-label="Назад">←</button>
        <div className="myvotes__title">Мои оценки</div>
      </div>
      <div className="myvotes__body">
        {loading && <div className="myvotes__empty">Загрузка…</div>}
        {!loading && votes.length === 0 && (
          <div className="myvotes__empty">Ты ещё не голосовал ни за один образ.</div>
        )}
        {votes.map((v) => {
          const name = v.author_name || (v.author_hide ? 'user' : '@' + (v.author_username || 'user'))
          return (
            <div className="myvotes__row" key={v.vote_id}>
              {v.media_url && <img className="myvotes__thumb" src={v.media_url} alt="" />}
              <div className="myvotes__info">
                <div className="myvotes__author">{name}</div>
                <div className="myvotes__meta">Рейтинг образа: {v.score}</div>
              </div>
              <div className="myvotes__amount">{v.amount} 💧</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

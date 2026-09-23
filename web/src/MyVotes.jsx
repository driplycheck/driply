import { useEffect, useState } from 'react'
import { readPrivate } from './api.js'
import './MyVotes.css'
import { t } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'

export default function MyVotes({ onClose, onOpenPost }) {
  const [votes, setVotes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const data = await readPrivate('my_votes')
      if (!active) return
      if (data === null) console.error('my_votes: не удалось загрузить')
      setVotes(Array.isArray(data) ? data : [])
      setLoading(false)
    })()
    return () => { active = false }
  }, [])

  return (
    <div className="myvotes">
      <div className="myvotes__head">
        <button className="myvotes__back" onClick={onClose} aria-label={t('back')}>←</button>
        <div className="myvotes__title">{t('my_votes')}</div>
      </div>
      <div className="myvotes__body">
        {loading && <div className="myvotes__empty">{t('loading')}</div>}
        {!loading && votes.length === 0 && (
          <div className="myvotes__empty">{t('votes_empty')}</div>
        )}
        {votes.map((v) => {
          const name = v.author_name || (v.author_hide ? 'user' : '@' + (v.author_username || 'user'))
          return (
            <button className="myvotes__row" key={v.vote_id} onClick={() => onOpenPost?.(v.post_id)}>
              {v.media_url && <img className="myvotes__thumb" src={v.media_url} alt="" />}
              <div className="myvotes__info">
                <div className="myvotes__author">{name}</div>
                <div className="myvotes__meta">{t('look_score', { n: v.score })}</div>
              </div>
              <div className="myvotes__amount">{v.amount} <DripCoin size={15} /></div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

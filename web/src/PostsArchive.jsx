import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

export default function PostsArchive({ onClose, onChanged }) {
  const [posts, setPosts] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  function tgId() {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? 0
  }
  async function load() {
    const { data } = await supabase.rpc('my_posts', { p_tid: tgId() })
    setPosts(Array.isArray(data) ? data : [])
  }
  useEffect(() => { load() }, [])

  async function toggleHidden(p) {
    if (busyId) return
    setBusyId(p.id)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'set_post_hidden', initData: getInitData(), post_id: p.id, hidden: !p.hidden },
    })
    setBusyId(null)
    if (!error) { await load(); onChanged?.() }
  }

  async function removeForever(id) {
    if (busyId) return
    setBusyId(id)
    const { error } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'delete_post', initData: getInitData(), post_id: id },
    })
    setBusyId(null)
    setConfirmId(null)
    if (!error) { await load(); onChanged?.() }
  }

  return (
    <div className="archive">
      <header className="archive__top">
        <button className="archive__close" onClick={onClose}>‹ Назад</button>
        <span className="archive__title">История публикаций</span>
        <span className="archive__spacer" />
      </header>
      <div className="archive__body">
        {!posts ? (
          <div className="state">Загрузка…</div>
        ) : posts.length === 0 ? (
          <div className="state">Пока нет публикаций</div>
        ) : (
          posts.map((p) => (
            <div className={`arow ${p.hidden ? 'arow--hidden' : ''}`} key={p.id}>
              <div className="arow__thumb" style={{ backgroundImage: `url(${p.media_url})` }}>
                {p.hidden && <span className="arow__badge">скрыт</span>}
              </div>
              <div className="arow__mid">
                <div className="arow__score">💧 {p.score}</div>
                {p.caption && <div className="arow__cap">{p.caption}</div>}
              </div>
              <div className="arow__acts">
                <button className="arow__btn" disabled={busyId === p.id}
                  onClick={() => toggleHidden(p)}>
                  {p.hidden ? 'Вернуть' : 'Скрыть'}
                </button>
                <button className="arow__btn arow__btn--del" disabled={busyId === p.id}
                  onClick={() => setConfirmId(p.id)}>
                  Удалить
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmId && (
        <div className="confirm">
          <div className="confirm__box">
            <div className="confirm__title">Удалить навсегда?</div>
            <div className="confirm__hint">
              Примечание: очки, набранные за этот образ, будут списаны с твоего рейтинга.
              Награда за публикацию останется. Действие необратимо.
            </div>
            <div className="confirm__row">
              <button className="confirm__no" onClick={() => setConfirmId(null)} disabled={!!busyId}>Отмена</button>
              <button className="confirm__yes confirm__yes--danger" onClick={() => removeForever(confirmId)} disabled={!!busyId}>
                {busyId ? '…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

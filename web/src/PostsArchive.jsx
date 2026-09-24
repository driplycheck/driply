import { useCallback, useEffect, useState } from 'react'
import { callOrToast, readPrivate } from './api.js'
import { t } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'

export default function PostsArchive({ onClose, onChanged, onEdit }) {
  const [posts, setPosts] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const [confirmId, setConfirmId] = useState(null)

  const load = useCallback(async () => {
    const data = await readPrivate('my_posts')
    setPosts(Array.isArray(data) ? data : [])
  }, [])
  useEffect(() => { load() }, [load])

  async function toggleHidden(p) {
    if (busyId) return
    setBusyId(p.id)
    const res = await callOrToast('set_post_hidden', { post_id: p.id, hidden: !p.hidden })
    setBusyId(null)
    if (res.ok) { await load(); onChanged?.() }
  }

  async function removeForever(id) {
    if (busyId) return
    setBusyId(id)
    const res = await callOrToast('delete_post', { post_id: id })
    setBusyId(null)
    setConfirmId(null)
    if (res.ok) { await load(); onChanged?.() }
  }

  return (
    <div className="archive">
      <header className="archive__top">
        <button className="archive__close" onClick={onClose}>{t('back')}</button>
        <span className="archive__title">{t('archive_title')}</span>
        <span className="archive__spacer" />
      </header>
      <div className="archive__body">
        {!posts ? (
          <div className="state">{t('loading')}</div>
        ) : posts.length === 0 ? (
          <div className="state">{t('no_posts')}</div>
        ) : (
          posts.map((p) => (
            <div className={`arow ${p.hidden ? 'arow--hidden' : ''}`} key={p.id}>
              <div className="arow__thumb" style={{ backgroundImage: `url(${p.media_url})` }}>
                {p.hidden && <span className="arow__badge">{t('hidden_badge')}</span>}
              </div>
              <div className="arow__mid">
                <div className="arow__score"><DripCoin size={14} /> {p.score}</div>
                {p.caption && <div className="arow__cap">{p.caption}</div>}
              </div>
              <div className="arow__acts">
                <button className="arow__btn" disabled={busyId === p.id}
                  onClick={() => onEdit?.(p)}>
                  {t('edit_post')}
                </button>
                <button className="arow__btn" disabled={busyId === p.id}
                  onClick={() => toggleHidden(p)}>
                  {p.hidden ? t('restore') : t('hide')}
                </button>
                <button className="arow__btn arow__btn--del" disabled={busyId === p.id}
                  onClick={() => setConfirmId(p.id)}>
                  {t('delete')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {confirmId && (
        <div className="confirm">
          <div className="confirm__box">
            <div className="confirm__title">{t('delete_forever')}</div>
            <div className="confirm__hint">
              {t('delete_hint')}
            </div>
            <div className="confirm__row">
              <button className="confirm__no" onClick={() => setConfirmId(null)} disabled={!!busyId}>{t('cancel')}</button>
              <button className="confirm__yes confirm__yes--danger" onClick={() => removeForever(confirmId)} disabled={!!busyId}>
                {busyId ? '…' : t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

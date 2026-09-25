import { useState } from 'react'
import { X } from 'lucide-react'
import './ui.css'

// Карточка принимает пропорции снимка: так у вертикальных фото нет полей,
// а слишком узкие и слишком широкие всё равно остаются в разумных рамках.
const MIN_RATIO = 0.5   // уже — уже не покажем, иначе карточка не влезает в экран
const MAX_RATIO = 0.82  // шире — начинает походить на пост, а не на образ
const clampRatio = (w, h) => (w && h ? Math.min(MAX_RATIO, Math.max(MIN_RATIO, w / h)) : null)

// Карточка образа: фото (одно или карусель до трёх) + тёмный скрим, всё поверх фото — on-photo токены.
// Логика (голос, жалоба, тосты) живёт снаружи и приходит слотами.
export default function OutfitCard({ images, imageUrl, badge, author, caption, tags, actions, children, priority = false }) {
  const photos = (images && images.length ? images : [imageUrl]).filter(Boolean)
  const [index, setIndex] = useState(0)
  const [ratio, setRatio] = useState(null)
  const [zoom, setZoom] = useState(false)

  function onFirstLoad(e) {
    const r = clampRatio(e.target.naturalWidth, e.target.naturalHeight)
    if (r) setRatio(r)
  }

  function onSlide(e) {
    const el = e.currentTarget
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
    if (i !== index) setIndex(i)
  }

  return (
    <article className="ocard" style={ratio ? { aspectRatio: String(ratio) } : undefined}>
      {photos.length > 1 ? (
        <div className="ocard__slides" onScroll={onSlide}>
          {photos.map((src, i) => (
            <div className="ocard__slide" key={src + i}>
              {/* подложка — то же фото, размытое: образ виден целиком, без чёрных полей */}
              <img className="ocard__blur" src={src} alt="" aria-hidden="true" decoding="async" />
              <img className="ocard__photo" src={src} alt=""
                onLoad={i === 0 ? onFirstLoad : undefined}
                onClick={() => setZoom(true)}
                loading={i === 0 && priority ? 'eager' : 'lazy'}
                fetchPriority={i === 0 && priority ? 'high' : 'auto'} decoding="async" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <img className="ocard__blur" src={photos[0]} alt="" aria-hidden="true" decoding="async" />
          <img className="ocard__img" src={photos[0]} alt=""
            onLoad={onFirstLoad}
            onClick={() => setZoom(true)}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
        </>
      )}
      <div className="ocard__scrim" />
      {(badge || photos.length > 1) && (
        <div className="ocard__top">
          {badge}
          {photos.length > 1 && (
            <span className="ocard__dots" aria-label={`${index + 1} / ${photos.length}`}>
              {photos.map((_, i) => <i key={i} className={i === index ? 'on' : ''} />)}
            </span>
          )}
        </div>
      )}

      <div className="ocard__bottom">
        {author && (
          <button className="ocard__author" onClick={author.onClick}>
            {author.avatarUrl
              ? <img className={`ocard__ava ${author.tierClass || ''}`} src={author.avatarUrl} alt="" />
              : <span className="ocard__ava ocard__ava--empty" />}
            <span className="ocard__who">
              <span className="ocard__name">{author.name}</span>
              {author.meta && <span className="ocard__meta">{author.meta}</span>}
            </span>
          </button>
        )}
        {caption && <p className="ocard__caption">{caption}</p>}
        {tags}
        {actions && <div className="ocard__actions">{actions}</div>}
      </div>
      {children}

      {/* во весь экран: образ разглядывают, а карточка ограничена высотой ленты */}
      {zoom && (
        <div className="photoview" onClick={() => setZoom(false)}>
          <img src={photos[index]} alt="" />
          <button className="photoview__close" aria-label="×" onClick={() => setZoom(false)}>
            <X size={20} strokeWidth={2.4} />
          </button>
        </div>
      )}
    </article>
  )
}

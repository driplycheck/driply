import { useState } from 'react'
import './ui.css'

// Карточка образа: фото (одно или карусель до трёх) + тёмный скрим, всё поверх фото — on-photo токены.
// Логика (голос, жалоба, тосты) живёт снаружи и приходит слотами.
export default function OutfitCard({ images, imageUrl, badge, author, caption, tags, actions, children }) {
  const photos = (images && images.length ? images : [imageUrl]).filter(Boolean)
  const [index, setIndex] = useState(0)

  function onSlide(e) {
    const el = e.currentTarget
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth))
    if (i !== index) setIndex(i)
  }

  return (
    <article className="ocard">
      {photos.length > 1 ? (
        <div className="ocard__slides" onScroll={onSlide}>
          {photos.map((src, i) => (
            <img key={src + i} className="ocard__slide" src={src} alt="" loading={i ? 'lazy' : 'eager'} decoding="async" />
          ))}
        </div>
      ) : (
        <img className="ocard__img" src={photos[0]} alt="" loading="lazy" decoding="async" />
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
    </article>
  )
}

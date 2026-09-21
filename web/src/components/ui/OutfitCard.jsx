import './ui.css'

// Карточка образа: фото + тёмный скрим, всё поверх фото — on-photo токены.
// Логика (голос, жалоба, тосты) живёт снаружи и приходит слотами.
export default function OutfitCard({ imageUrl, badge, author, caption, tags, actions, children }) {
  return (
    <article className="ocard">
      <img className="ocard__img" src={imageUrl} alt="" loading="lazy" decoding="async" />
      <div className="ocard__scrim" />
      {badge && <div className="ocard__top">{badge}</div>}

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

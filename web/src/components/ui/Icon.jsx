import { CATEGORY_ICONS, STYLE_ICONS } from './icon-paths.js'

// Штриховые иконки на сетке 24: цвет всегда currentColor, поэтому тема применяется сама собой.
function StrokeIcon({ markup, size = 16, className = '' }) {
  if (!markup) return null
  return (
    <svg
      className={`icon ${className}`}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  )
}

export function CategoryIcon({ category, size = 16, className }) {
  return <StrokeIcon markup={CATEGORY_ICONS[category] || CATEGORY_ICONS.other} size={size} className={className} />
}

export function StyleIcon({ slug, size = 16, className }) {
  return <StrokeIcon markup={STYLE_ICONS[slug]} size={size} className={className} />
}

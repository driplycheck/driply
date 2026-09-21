import './ui.css'

// бейдж поверх фото: стекло и --on-photo в любой теме
export default function GlassBadge({ className = '', children }) {
  return <span className={`ui-glass-badge ${className}`}>{children}</span>
}

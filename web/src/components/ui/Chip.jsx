import './ui.css'

export default function Chip({ active = false, onClick, children }) {
  return (
    <button className={`ui-chip ${active ? 'ui-chip--on' : ''}`} onClick={onClick} aria-pressed={active}>
      {children}
    </button>
  )
}

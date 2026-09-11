export default function Overlay({ children, onClose, variant = 'sheet' }) {
  return (
    <div className="overlay-backdrop" onClick={onClose}>
      <div
        className={`overlay-panel overlay-${variant}`}
        onClick={(e) => e.stopPropagation()}
        style={{ paddingBottom: 'var(--safe-bottom, 0px)' }}
      >
        {children}
      </div>
    </div>
  )
}

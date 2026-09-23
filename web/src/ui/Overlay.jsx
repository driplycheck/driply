export default function Overlay({ children, onClose, variant = 'sheet', leaving = false }) {
  return (
    // анимация живёт на обёртке: экраны внутри position:fixed, но подхватывают её как потомки
    <div className={`overlay-backdrop ${leaving ? 'is-leaving' : ''}`} onClick={leaving ? undefined : onClose}>
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

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

// Просмотр фото во весь экран с приближением.
//
// Зум свой, а не браузерный: в мини-аппе страница объявлена user-scalable=no,
// иначе Telegram вместе с фото тянул бы всю вёрстку. Поэтому масштаб и сдвиг
// мы считаем сами и применяем трансформацией к одной картинке.
//
// Жесты: щипок двумя пальцами, перетаскивание одним (когда приближено),
// двойное касание — приблизить к точке и обратно. На компьютере — колесо.

const MAX_SCALE = 4
const DOUBLE_TAP_SCALE = 2.5
const TAP_MS = 250      // дольше — это уже удержание, а не касание
const TAP_SLOP = 10     // сдвиг в пределах пальца, касание всё ещё считается точным
const DOUBLE_TAP_MS = 300

export default function PhotoView({ src, alt = '', onClose }) {
  const boxRef = useRef(null)
  const imgRef = useRef(null)
  // живое состояние жеста держим в ref: перерисовывать React на каждый кадр незачем
  const view = useRef({ scale: 1, x: 0, y: 0 })
  const pointers = useRef(new Map())
  const pinch = useRef(null)
  const tap = useRef({ time: 0, x: 0, y: 0, moved: false, last: 0 })
  const [zoomed, setZoomed] = useState(false)

  // Насколько картинка видна на экране при масштабе 1 — от этого считаются границы сдвига,
  // иначе фото можно утащить за край и остаться с пустым чёрным полем.
  //
  // Размеры берём прямо у картинки, а не из события загрузки: браузер знает их раньше,
  // чем файл дочитан до конца, а из кэша событие загрузки может не прийти вовсе.
  // Пока размеров нет, сдвиг остаётся нулевым — и протяжка не работала бы молча.
  const fitted = useCallback(() => {
    const box = boxRef.current
    const img = imgRef.current
    if (!box || !img?.naturalWidth || !img.naturalHeight) return null
    const cw = box.clientWidth
    const ch = box.clientHeight
    const k = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
    return { cw, ch, w: img.naturalWidth * k, h: img.naturalHeight * k }
  }, [])

  const clamp = useCallback((v) => {
    const f = fitted()
    v.scale = Math.min(MAX_SCALE, Math.max(1, v.scale))
    if (!f) { v.x = 0; v.y = 0; return v }
    const maxX = Math.max(0, (f.w * v.scale - f.cw) / 2)
    const maxY = Math.max(0, (f.h * v.scale - f.ch) / 2)
    v.x = Math.min(maxX, Math.max(-maxX, v.x))
    v.y = Math.min(maxY, Math.max(-maxY, v.y))
    return v
  }, [fitted])

  const apply = useCallback((animate = false) => {
    const el = imgRef.current
    if (!el) return
    const v = clamp(view.current)
    el.style.transition = animate ? 'transform 0.22s cubic-bezier(0.22, 0.61, 0.36, 1)' : 'none'
    el.style.transform = `translate3d(${v.x}px, ${v.y}px, 0) scale(${v.scale})`
    setZoomed(v.scale > 1.01)
  }, [clamp])

  // Приближение к точке: точка под пальцем должна остаться на месте,
  // иначе фото «прыгает» из-под пальца и попасть в деталь невозможно.
  const zoomTo = useCallback((nextScale, px, py, animate) => {
    const box = boxRef.current
    if (!box) return
    const r = box.getBoundingClientRect()
    const cx = px - r.left - r.width / 2
    const cy = py - r.top - r.height / 2
    const v = view.current
    const k = nextScale / v.scale
    v.x = cx - (cx - v.x) * k
    v.y = cy - (cy - v.y) * k
    v.scale = nextScale
    apply(animate)
  }, [apply])

  const reset = useCallback((animate) => {
    view.current = { scale: 1, x: 0, y: 0 }
    apply(animate)
  }, [apply])

  // Открываем всегда в исходном виде: остаться в чужом приближении от прошлого фото — неожиданно.
  useEffect(() => { reset(false) }, [src, reset])

  function onPointerDown(e) {
    // захват указателя — удобство, а не обязанность: он умеет бросать исключение
    // (например, если указатель уже отпущен), и тогда весь жест просто не начинался
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* не беда */ }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = {
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        scale: view.current.scale,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2,
      }
    } else if (pointers.current.size === 1) {
      tap.current = { ...tap.current, time: Date.now(), x: e.clientX, y: e.clientY, moved: false }
    }
  }

  function onPointerMove(e) {
    const p = pointers.current.get(e.pointerId)
    if (!p) return
    const prev = { ...p }
    p.x = e.clientX
    p.y = e.clientY

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      if (pinch.current.dist > 0) {
        tap.current.moved = true
        zoomTo(pinch.current.scale * (dist / pinch.current.dist), pinch.current.mx, pinch.current.my, false)
      }
      return
    }

    // одним пальцем двигаем только приближённое фото: иначе жест ничего не делает
    if (pointers.current.size === 1 && view.current.scale > 1.01) {
      view.current.x += e.clientX - prev.x
      view.current.y += e.clientY - prev.y
      tap.current.moved = true
      apply(false)
      return
    }
    if (Math.hypot(e.clientX - tap.current.x, e.clientY - tap.current.y) > TAP_SLOP) tap.current.moved = true
  }

  function onPointerUp(e) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
    // после щипка масштаб мог уйти ниже единицы — возвращаем мягко
    if (pointers.current.size === 0 && view.current.scale < 1.01) reset(true)
    if (pointers.current.size !== 0) return

    const quick = Date.now() - tap.current.time < TAP_MS
    if (!quick || tap.current.moved) return

    const now = Date.now()
    if (now - tap.current.last < DOUBLE_TAP_MS) {
      tap.current.last = 0
      if (view.current.scale > 1.01) reset(true)
      else zoomTo(DOUBLE_TAP_SCALE, e.clientX, e.clientY, true)
      return
    }
    tap.current.last = now
    // одиночное касание закрывает только когда не приближено:
    // иначе разглядывание деталей всё время обрывалось бы случайным тапом
    if (view.current.scale <= 1.01) {
      setTimeout(() => { if (tap.current.last === now) onClose() }, DOUBLE_TAP_MS)
    }
  }

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // колесо вешаем вручную: React делает такой обработчик пассивным, и preventDefault в нём не работает
  useEffect(() => {
    const box = boxRef.current
    if (!box) return
    const handler = (e) => {
      e.preventDefault()
      const next = view.current.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)
      zoomTo(Math.min(MAX_SCALE, Math.max(1, next)), e.clientX, e.clientY, false)
    }
    box.addEventListener('wheel', handler, { passive: false })
    return () => box.removeEventListener('wheel', handler)
  }, [zoomTo])

  return (
    <div
      className={`photoview ${zoomed ? 'photoview--zoomed' : ''}`}
      ref={boxRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <img ref={imgRef} src={src} alt={alt} draggable="false" />
      <button className="photoview__close" aria-label="×"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onClose() }}>
        <X size={20} strokeWidth={2.4} />
      </button>
    </div>
  )
}

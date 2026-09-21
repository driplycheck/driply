import { useEffect } from 'react'

// Постраничная прокрутка ленты: один жест — один пост.
// CSS scroll-snap во вьюхах Telegram (особенно Desktop с тачпадом) пролетает
// несколько карточек по инерции, поэтому листаем сами.
const WHEEL_THRESHOLD = 24 // px накопленной дельты, чтобы считать жест
const WHEEL_QUIET_MS = 220 // пауза, после которой начинается новый жест (гасит инерцию тачпада)
const SWIPE_DISTANCE = 48
const SWIPE_VELOCITY = 0.35 // px/ms
const DURATION = 380

function ease(t) { return 1 - Math.pow(1 - t, 3) }

export function usePager(ref, itemSelector, deps) {
  useEffect(() => {
    const el = ref.current
    if (!el) return

    let anim = null
    let wheel = { last: 0, acc: 0, used: false }
    let touch = null

    function stops() {
      const pad = parseFloat(getComputedStyle(el).scrollPaddingTop) || 0
      const base = el.getBoundingClientRect().top - el.scrollTop
      const max = el.scrollHeight - el.clientHeight
      const list = [0]
      el.querySelectorAll(itemSelector).forEach((item) => {
        const top = Math.min(max, Math.max(0, item.getBoundingClientRect().top - base - pad))
        if (top - list[list.length - 1] > 4) list.push(top)
      })
      return list
    }

    function nearest(list, y) {
      let best = 0
      list.forEach((s, i) => { if (Math.abs(s - y) < Math.abs(list[best] - y)) best = i })
      return best
    }

    function animateTo(target) {
      cancelAnimationFrame(anim?.raf)
      const from = el.scrollTop
      const start = performance.now()
      anim = { raf: 0 }
      const step = (now) => {
        const p = Math.min(1, (now - start) / DURATION)
        el.scrollTop = from + (target - from) * ease(p)
        if (p < 1) anim.raf = requestAnimationFrame(step)
        else anim = null
      }
      anim.raf = requestAnimationFrame(step)
    }

    function go(dir, fromY = el.scrollTop) {
      const list = stops()
      const i = nearest(list, fromY)
      const j = Math.max(0, Math.min(list.length - 1, i + dir))
      animateTo(list[j])
    }

    function onWheel(e) {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return // горизонтальный скролл чипов
      e.preventDefault()
      const now = performance.now()
      if (now - wheel.last > WHEEL_QUIET_MS) wheel = { last: now, acc: 0, used: false }
      wheel.last = now
      if (wheel.used) return
      wheel.acc += e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY
      if (Math.abs(wheel.acc) >= WHEEL_THRESHOLD) {
        wheel.used = true
        go(Math.sign(wheel.acc))
      }
    }

    function onTouchStart(e) {
      if (e.touches.length !== 1) { touch = null; return }
      cancelAnimationFrame(anim?.raf); anim = null
      const p = e.touches[0]
      touch = { x: p.clientX, y: p.clientY, t: performance.now(), top: el.scrollTop, axis: null }
    }

    function onTouchMove(e) {
      if (!touch) return
      const p = e.touches[0]
      const dx = p.clientX - touch.x
      const dy = p.clientY - touch.y
      if (!touch.axis) {
        if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
        touch.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
      }
      if (touch.axis !== 'y') return
      e.preventDefault()
      el.scrollTop = touch.top - dy
    }

    function onTouchEnd(e) {
      if (!touch || touch.axis !== 'y') { touch = null; return }
      const p = e.changedTouches[0]
      const dy = touch.y - p.clientY
      const v = dy / Math.max(1, performance.now() - touch.t)
      const dir = dy > SWIPE_DISTANCE || v > SWIPE_VELOCITY ? 1
        : dy < -SWIPE_DISTANCE || v < -SWIPE_VELOCITY ? -1 : 0
      go(dir, touch.top)
      touch = null
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchEnd)
    return () => {
      cancelAnimationFrame(anim?.raf)
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

import { useCallback, useEffect, useRef, useState } from 'react'
import { setBackHandler } from './telegram.js'

// столько живёт экран после pop — ровно длительность анимации закрытия
const EXIT_MS = 190

function makeEntry(type, props) {
  return { type, props, key: Date.now() + Math.random() }
}

export function useOverlayStack() {
  const [stack, setStack] = useState([])
  const exitTimer = useRef(null)

  const push = useCallback((type, props = {}) => {
    clearTimeout(exitTimer.current)
    // экран, который сейчас закрывается, убираем сразу — иначе он мигнёт под новым
    setStack((s) => [...s.filter((e) => !e.leaving), makeEntry(type, props)])
  }, [])

  // заменяет верхний экран новым, без истории (поиск -> профиль и т.п.)
  const replace = useCallback((type, props = {}) => {
    setStack((s) => [...s.slice(0, -1), makeEntry(type, props)])
  }, [])

  const pop = useCallback(() => {
    setStack((s) => {
      const last = s[s.length - 1]
      if (!last || last.leaving) return s
      return [...s.slice(0, -1), { ...last, leaving: true }]
    })
    clearTimeout(exitTimer.current)
    exitTimer.current = setTimeout(() => setStack((s) => s.filter((e) => !e.leaving)), EXIT_MS)
  }, [])

  const closeAll = useCallback(() => setStack([]), [])

  // форсит remount всех экранов данного типа в стеке (даже скрытых) —
  // нужно, когда данные изменились в дочернем экране (например EditProfile)
  const touch = useCallback((type) => {
    setStack((s) => s.map((item) => (item.type === type ? { ...item, key: Date.now() + Math.random() } : item)))
  }, [])

  const top = stack[stack.length - 1]

  useEffect(() => () => clearTimeout(exitTimer.current), [])

  useEffect(() => {
    return setBackHandler(top && !top.leaving ? pop : null)
  }, [top, pop])

  return { stack, top, push, replace, pop, closeAll, touch }
}

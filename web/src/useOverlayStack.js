import { useCallback, useEffect, useState } from 'react'
import { setBackHandler } from './telegram.js'

function makeEntry(type, props) {
  return { type, props, key: Date.now() + Math.random() }
}

export function useOverlayStack() {
  const [stack, setStack] = useState([])

  const push = useCallback((type, props = {}) => {
    setStack((s) => [...s, makeEntry(type, props)])
  }, [])

  // заменяет верхний экран новым, без истории (поиск -> профиль и т.п.)
  const replace = useCallback((type, props = {}) => {
    setStack((s) => [...s.slice(0, -1), makeEntry(type, props)])
  }, [])

  const pop = useCallback(() => {
    setStack((s) => s.slice(0, -1))
  }, [])

  const closeAll = useCallback(() => setStack([]), [])

  // форсит remount всех экранов данного типа в стеке (даже скрытых) —
  // нужно, когда данные изменились в дочернем экране (например EditProfile)
  const touch = useCallback((type) => {
    setStack((s) => s.map((item) => (item.type === type ? { ...item, key: Date.now() + Math.random() } : item)))
  }, [])

  const top = stack[stack.length - 1]

  useEffect(() => {
    return setBackHandler(top ? pop : null)
  }, [top, pop])

  return { stack, top, push, replace, pop, closeAll, touch }
}

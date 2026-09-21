export const tg = window.Telegram?.WebApp

function applyViewport() {
  const h = (tg && (tg.viewportStableHeight || tg.viewportHeight)) || window.innerHeight
  document.documentElement.style.setProperty('--app-height', h + 'px')
  const inset = tg?.safeAreaInset?.bottom ?? tg?.contentSafeAreaInset?.bottom ?? 0
  document.documentElement.style.setProperty('--safe-bottom', inset + 'px')
}

export function initTelegram() {
  if (!tg) {
    applyViewport()
    window.addEventListener('resize', applyViewport)
    return null
  }
  tg.ready()
  tg.expand()
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes()
  applyViewport()
  if (tg.onEvent) {
    tg.onEvent('viewportChanged', applyViewport)
    tg.onEvent('safeAreaChanged', applyViewport)
  }
  window.addEventListener('resize', applyViewport)
  return tg.initDataUnsafe?.user ?? null
}

export function setBackHandler(onBack) {
  if (!tg?.BackButton) return () => {}
  if (onBack) {
    tg.BackButton.show()
    tg.BackButton.onClick(onBack)
  } else {
    tg.BackButton.hide()
  }
  return () => tg.BackButton.offClick(onBack)
}

export function hapticSelect() {
  tg?.HapticFeedback?.selectionChanged?.()
}

export function haptic(style = 'light') {
  tg?.HapticFeedback?.impactOccurred?.(style)
}

export function getInitData() { return tg?.initData ?? '' }
export function getStartParam() { return tg?.initDataUnsafe?.start_param ?? '' }

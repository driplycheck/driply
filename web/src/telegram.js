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

// Атрибут capture честно открывает камеру только в Android-вебвью Telegram.
// В iOS, macOS и десктопе он игнорируется — открывается обычный выбор файла,
// поэтому там кнопку «Снять» не показываем: она обещала бы то, чего не делает.
export function canOpenCamera() {
  return tg?.platform === 'android'
}
// код приглашения: из start_param (ссылка ?startapp=) либо из адреса (?ref= от бота)
export function getStartParam() {
  const fromTg = window.Telegram?.WebApp?.initDataUnsafe?.start_param
  if (fromTg) return fromTg
  try {
    const ref = new URLSearchParams(window.location.search).get('ref')
    return ref ? 'ref_' + ref : ''
  } catch { return '' }
}

export const tg = window.Telegram?.WebApp

function applyViewport() {
  const h = (tg && (tg.viewportStableHeight || tg.viewportHeight)) || window.innerHeight
  document.documentElement.style.setProperty('--app-height', h + 'px')
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
  if (tg.setHeaderColor) tg.setHeaderColor('#0a0a0b')
  if (tg.setBackgroundColor) tg.setBackgroundColor('#0a0a0b')
  applyViewport()
  if (tg.onEvent) tg.onEvent('viewportChanged', applyViewport)
  window.addEventListener('resize', applyViewport)
  return tg.initDataUnsafe?.user ?? null
}

export function getInitData() {
  return tg?.initData ?? ''
}

export function getStartParam() {
  return tg?.initDataUnsafe?.start_param ?? ''
}

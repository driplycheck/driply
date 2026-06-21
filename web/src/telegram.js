// Telegram WebApp helpers
export const tg = window.Telegram?.WebApp

export function initTelegram() {
  if (!tg) return null
  tg.ready()
  tg.expand()
  // prevent Telegram's swipe-to-close from fighting the vertical feed
  if (tg.disableVerticalSwipes) tg.disableVerticalSwipes()
  if (tg.setHeaderColor) tg.setHeaderColor('#0a0a0b')
  if (tg.setBackgroundColor) tg.setBackgroundColor('#0a0a0b')
  return tg.initDataUnsafe?.user ?? null
}

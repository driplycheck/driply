// Telegram WebApp helpers
export const tg = window.Telegram?.WebApp

export function initTelegram() {
  if (!tg) return null
  tg.ready()
  tg.expand()
  return tg.initDataUnsafe?.user ?? null
}

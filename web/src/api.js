import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

// Приватные данные «про себя» ходят через quick-handler: он проверяет подпись Telegram
// и сам подставляет telegram_id. Напрямую из браузера эти RPC закрыты.
export async function readPrivate(fn) {
  const { data, error } = await supabase.functions.invoke('quick-handler', {
    body: { action: 'read', fn, initData: getInitData() },
  })
  if (error) return null
  return data
}

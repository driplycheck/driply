import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

// Воронка: события пишет edge function под service_role. Молча, без задержек для UI.
export function track(kind, meta = {}) {
  const initData = getInitData()
  if (!initData) return
  supabase.functions
    .invoke('quick-handler', { body: { action: 'track', initData, kind, meta } })
    .catch(() => {})
}

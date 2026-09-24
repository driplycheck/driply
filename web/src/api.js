import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { t } from './i18n.js'
import { toast } from './toast.js'

// Приватные данные «про себя» ходят через quick-handler: он проверяет подпись Telegram
// и сам подставляет telegram_id. Напрямую из браузера эти RPC закрыты.
export async function readPrivate(fn) {
  const { data, error } = await supabase.functions.invoke('quick-handler', {
    body: { action: 'read', fn, initData: getInitData() },
  })
  if (error) return null
  return data
}

// Единая точка вызова роутера. Настоящая причина ошибки лежит в теле ответа,
// а не в объекте error, — без разбора тела всё выглядит как «попробуй ещё раз».
export async function call(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('quick-handler', {
    body: { action, initData: getInitData(), ...payload },
  })
  if (!error) return { ok: true, data, code: null }
  let code = null
  try { code = (await error.context?.json())?.error ?? null } catch { /* сеть или не-JSON */ }
  return { ok: false, data: null, code: normalize(code) }
}

// Из базы код прилетает внутри текста исключения PostgREST — вытаскиваем его
function normalize(raw) {
  if (!raw) return 'NETWORK'
  const found = String(raw).match(/[A-Z][A-Z_0-9]{3,}/)
  return found ? found[0] : 'UNKNOWN'
}

// Коды из quick-handler и из исключений SQL-функций → строки для человека
const ERROR_KEYS = {
  RATE_LIMIT: 'err_rate_limit',
  AUTH_FAILED: 'auth_failed',
  TOO_SHORT: 'err_too_short',
  NOT_ENOUGH_CREDITS: 'not_enough_credits',
  ALREADY_VOTED: 'already_voted',
  CANNOT_VOTE_OWN: 'cannot_vote_own',
  CANNOT_FOLLOW_SELF: 'err_self',
  CANNOT_BLOCK_SELF: 'err_self',
  EMPTY_NICKNAME: 'err_empty_nickname',
  INVALID_AMOUNT: 'err_invalid_amount',
  BAD_AVATAR_URL: 'err_bad_image',
  BAD_MEDIA_URL: 'err_bad_image',
  POST_NOT_FOUND: 'err_post_gone',
  NO_USER: 'err_no_user',
  NOT_OWNER: 'err_forbidden',
  FORBIDDEN: 'err_forbidden',
  NOT_DELIVERED: 'err_not_delivered',
  UPLOAD_FAILED: 'err_upload',
  NETWORK: 'err_network',
}

export function errorText(code) {
  return t(ERROR_KEYS[code] || 'err_generic')
}

// Для действий, у которых на экране нет своего места под ошибку: молча падать нельзя
export async function callOrToast(action, payload = {}) {
  const res = await call(action, payload)
  if (!res.ok) toast(errorText(res.code))
  return res
}

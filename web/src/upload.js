import { supabase } from './supabase.js'
import { call } from './api.js'

// Фото ужимаем в браузере: телефон снимает 3000+ px и 3–5 МБ, ленте это не нужно.
const MAX_SIDE = 1440
const QUALITY = 0.85

export async function compressImage(file) {
  try {
    // imageOrientation: from-image — иначе фото с телефона ложится набок
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1 && file.size < 900 * 1024) return file
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', QUALITY))
    return blob && blob.size < file.size ? blob : file
  } catch {
    return file // не смогли сжать — грузим как есть
  }
}

// Загрузка только по одноразовой подписанной ссылке от quick-handler:
// прямой доступ к хранилищу с публичного ключа закрыт.
export async function uploadImage(file, kind = 'post') {
  const prepared = await compressImage(file)
  const type = prepared.type || file.type || 'image/jpeg'
  const ext = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg'

  const res = await call('upload_url', { kind, ext })
  if (!res.ok || !res.data?.token) throw Object.assign(new Error('upload_url'), { code: res.code })
  const data = res.data

  const { error: upErr } = await supabase.storage
    .from('outfits')
    .uploadToSignedUrl(data.path, data.token, prepared, { contentType: type })
  if (upErr) throw Object.assign(new Error('upload'), { code: 'UPLOAD_FAILED' })

  return data.publicUrl
}

import { supabase } from './supabase.js'
import { tg } from './telegram.js'

function loadImg(src) {
  return new Promise((res) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

function render({ user, rank, postsCount, avatarImg }) {
  const W = 1080, H = 1920
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')

  const g = ctx.createLinearGradient(0, 0, 0, H)
  g.addColorStop(0, '#141418'); g.addColorStop(1, '#0a0a0b')
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  ctx.textAlign = 'center'

  ctx.fillStyle = '#f4c430'; ctx.font = '700 70px sans-serif'
  ctx.fillText('DRIPLY', W / 2, 270)

  const cx = W / 2, cy = 640, r = 200
  ctx.fillStyle = '#1f1f25'; ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2); ctx.fill()
  if (avatarImg) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(avatarImg, cx - r, cy - r, r * 2, r * 2); ctx.restore()
  } else {
    ctx.fillStyle = '#2a2a31'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = '#f4c430'; ctx.font = '700 170px sans-serif'
    ctx.fillText((user.display_name || 'D').slice(0, 1).toUpperCase(), cx, cy + 60)
  }
  ctx.strokeStyle = '#f4c430'; ctx.lineWidth = 14
  ctx.beginPath(); ctx.arc(cx, cy, r + 7, 0, Math.PI * 2); ctx.stroke()

  ctx.fillStyle = '#fff'; ctx.font = '700 84px sans-serif'
  ctx.fillText(user.display_name || 'user', W / 2, 1010)

  ctx.fillStyle = '#f4c430'; ctx.font = '700 130px sans-serif'
  ctx.fillText('★ ' + user.style_score, W / 2, 1230)
  ctx.fillStyle = '#9a9aa2'; ctx.font = '400 50px sans-serif'
  ctx.fillText('очки стиля', W / 2, 1300)

  ctx.fillStyle = '#fff'; ctx.font = '700 100px sans-serif'
  ctx.fillText('#' + rank + ' в рейтинге', W / 2, 1470)
  ctx.fillStyle = '#9a9aa2'; ctx.font = '400 54px sans-serif'
  ctx.fillText(postsCount + ' образов', W / 2, 1560)

  ctx.fillStyle = '#6a6a72'; ctx.font = '400 46px sans-serif'
  ctx.fillText('t.me/Driplycheckbot', W / 2, 1800)
  return c
}

function toBlob(canvas) {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png', 0.92))
}

export async function shareRankCard({ user, rank, postsCount }) {
  if (!tg || !tg.shareToStory) return { ok: false, reason: 'unsupported' }
  let blob
  try {
    const avatarImg = user.avatar_url ? await loadImg(user.avatar_url) : null
    try {
      blob = await toBlob(render({ user, rank, postsCount, avatarImg }))
    } catch {
      blob = await toBlob(render({ user, rank, postsCount, avatarImg: null }))
    }
  } catch {
    return { ok: false, reason: 'render' }
  }

  const path = `cards/${user.id}-${Date.now()}.png`
  const { error } = await supabase.storage.from('outfits').upload(path, blob, { contentType: 'image/png' })
  if (error) return { ok: false, reason: 'upload' }
  const { data: pub } = supabase.storage.from('outfits').getPublicUrl(path)

  try {
    tg.shareToStory(pub.publicUrl, {
      text: 'Мой стиль в Driply 🔥',
      widget_link: { url: 'https://t.me/Driplycheckbot', name: 'Driply' },
    })
    return { ok: true }
  } catch {
    return { ok: false, reason: 'share' }
  }
}

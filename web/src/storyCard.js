import { supabase } from './supabase.js'
import { tg } from './telegram.js'
import { getInitData } from './telegram.js'
import { t } from './i18n.js'

function loadImg(src) {
  return new Promise((res) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

const INK = '#09090B', LIME = '#C6FF3D', WHITE = '#F5F5F7', MUTED = '#8A8A96'
const BOT_LINK = 'https://t.me/Driplycheckbot'
const BADGE_LABEL = { founder: 'FOUNDER', cofounder: 'FOUNDER', first_drip: 'FIRST DRIP' }

// мягкое пятно света, как в приложении
function glow(ctx, x, y, r, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, color)
  g.addColorStop(1, 'rgba(9,9,11,0)')
  ctx.globalAlpha = alpha
  ctx.fillStyle = g
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1
}

// монета «дрип»: лаймовый круг с буквой d
function coin(ctx, x, y, r) {
  ctx.fillStyle = LIME
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = INK
  ctx.font = `900 ${Math.round(r * 1.15)}px Unbounded, sans-serif`
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText('d', x, y + r * 0.04)
  ctx.textBaseline = 'alphabetic'
}

// Фото образа во весь экран + статистика поверх. Если фото нет — тёмный фон со свечением.
export function renderStoryCard({ user, rank, postsCount, avatarImg, photoImg = null, link = BOT_LINK }) {
  const W = 1080, H = 1920
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')

  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H)

  if (photoImg) {
    // вписываем по короткой стороне, лишнее обрезаем — как object-fit: cover
    const scale = Math.max(W / photoImg.width, H / photoImg.height)
    const w = photoImg.width * scale, h = photoImg.height * scale
    ctx.drawImage(photoImg, (W - w) / 2, (H - h) / 2, w, h)
    // затемнение сверху и снизу: текст должен читаться на любом снимке
    const top = ctx.createLinearGradient(0, 0, 0, 420)
    top.addColorStop(0, 'rgba(9,9,11,0.75)'); top.addColorStop(1, 'rgba(9,9,11,0)')
    ctx.fillStyle = top; ctx.fillRect(0, 0, W, 420)
    const bottom = ctx.createLinearGradient(0, 820, 0, H)
    bottom.addColorStop(0, 'rgba(9,9,11,0)')
    bottom.addColorStop(0.55, 'rgba(9,9,11,0.88)')
    bottom.addColorStop(1, 'rgba(9,9,11,0.98)')
    ctx.fillStyle = bottom; ctx.fillRect(0, 820, W, H - 820)
  } else {
    glow(ctx, W * 0.85, 300, 620, 'rgba(198,255,61,0.30)', 1)
    glow(ctx, W * 0.1, H - 300, 560, 'rgba(124,92,255,0.34)', 1)
  }

  // логотип слева сверху
  ctx.textAlign = 'left'
  ctx.fillStyle = WHITE
  ctx.font = '900 64px Unbounded, sans-serif'
  ctx.fillText('driply', 72, 168)
  const logoW = ctx.measureText('driply').width
  ctx.fillStyle = LIME
  ctx.beginPath(); ctx.arc(72 + logoW + 22, 158, 11, 0, Math.PI * 2); ctx.fill()

  // статус справа сверху
  const badge = BADGE_LABEL[user.badge]
  if (badge) {
    ctx.font = '700 34px Onest, sans-serif'
    const bw = ctx.measureText(badge).width + 56
    ctx.strokeStyle = LIME; ctx.lineWidth = 3
    ctx.beginPath(); ctx.roundRect(W - 72 - bw, 118, bw, 62, 31); ctx.stroke()
    ctx.fillStyle = LIME
    ctx.textAlign = 'center'
    ctx.fillText(badge, W - 72 - bw / 2, 158)
    ctx.textAlign = 'left'
  }

  // низ: аватар, имя, место
  const avaR = 56, avaX = 72 + avaR, avaY = H - 470
  if (avatarImg) {
    ctx.save(); ctx.beginPath(); ctx.arc(avaX, avaY, avaR, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(avatarImg, avaX - avaR, avaY - avaR, avaR * 2, avaR * 2); ctx.restore()
  } else {
    ctx.fillStyle = '#1C1C22'
    ctx.beginPath(); ctx.arc(avaX, avaY, avaR, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = LIME
    ctx.font = '900 56px Unbounded, sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText((user.display_name || 'D').slice(0, 1).toUpperCase(), avaX, avaY + 20)
    ctx.textAlign = 'left'
  }
  ctx.strokeStyle = LIME; ctx.lineWidth = 6
  ctx.beginPath(); ctx.arc(avaX, avaY, avaR + 8, 0, Math.PI * 2); ctx.stroke()

  ctx.fillStyle = WHITE
  ctx.font = '600 56px Onest, sans-serif'
  ctx.fillText(user.display_name || 'user', avaX + avaR + 36, avaY - 6)
  ctx.fillStyle = MUTED
  ctx.font = '400 40px Onest, sans-serif'
  ctx.fillText(`${t('story_rank', { n: rank })} · ${t('story_looks', { n: postsCount })}`, avaX + avaR + 36, avaY + 48)

  // главное число: очки стиля с монетой
  const score = String(user.style_score ?? 0)
  ctx.font = '900 132px Unbounded, sans-serif'
  const R = 54, GAP = 30
  coin(ctx, 72 + R, H - 268, R)
  ctx.fillStyle = LIME
  ctx.textAlign = 'left'
  ctx.fillText(score, 72 + R * 2 + GAP, H - 224)
  const sw = ctx.measureText(score).width
  ctx.fillStyle = MUTED
  ctx.font = '400 40px Onest, sans-serif'
  ctx.fillText(t('stat_style_score'), 72 + R * 2 + GAP + sw + 28, H - 224)

  // ссылка снизу: у каждого своя реферальная
  const shown = link.replace(/^https?:\/\//, '')
  ctx.textAlign = 'center'
  ctx.fillStyle = MUTED
  let size = 42
  do {
    ctx.font = `500 ${size}px Onest, sans-serif`
    size -= 2
  } while (ctx.measureText(shown).width > W - 144 && size > 24)
  ctx.fillText(shown, W / 2, H - 110)
  return c
}

function toBlob(canvas) {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png', 0.92))
}

export async function shareRankCard({ user, rank, postsCount, link = BOT_LINK, photoUrl = null }) {
  if (!tg || !tg.shareToStory) return { ok: false, reason: 'unsupported' }
  let blob
  try {
    // без этого canvas нарисует системным шрифтом вместо Unbounded
    try { await document.fonts.ready } catch { /* не критично */ }
    const [avatarImg, photoImg] = await Promise.all([
      user.avatar_url ? loadImg(user.avatar_url) : null,
      photoUrl ? loadImg(photoUrl) : null,
    ])
    try {
      blob = await toBlob(renderStoryCard({ user, rank, postsCount, avatarImg, photoImg, link }))
    } catch {
      blob = await toBlob(renderStoryCard({ user, rank, postsCount, avatarImg: null, photoImg, link }))
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
      text: t('story_share_text'),
      widget_link: { url: link, name: 'Driply' },
    })
  } catch {
    return { ok: false, reason: 'share' }
  }
  let reward = null
  try {
    const { data } = await supabase.functions.invoke('quick-handler', {
      body: { action: 'reward_story', initData: getInitData() },
    })
    if (data?.rewarded) reward = data.reward
  } catch (_) { /* награда не критична */ }
  return { ok: true, reward }
}

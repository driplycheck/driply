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

export function renderStoryCard({ user, rank, postsCount, avatarImg, link = BOT_LINK }) {
  const W = 1080, H = 1920
  const c = document.createElement('canvas')
  c.width = W; c.height = H
  const ctx = c.getContext('2d')

  ctx.fillStyle = INK; ctx.fillRect(0, 0, W, H)
  glow(ctx, W * 0.85, 240, 620, 'rgba(198,255,61,0.30)', 1)
  glow(ctx, W * 0.1, H - 260, 560, 'rgba(124,92,255,0.34)', 1)

  ctx.textAlign = 'center'

  // логотип
  ctx.fillStyle = WHITE
  ctx.font = '900 84px Unbounded, sans-serif'
  const logo = 'driply'
  ctx.fillText(logo, W / 2 - 14, 250)
  const logoW = ctx.measureText(logo).width
  ctx.fillStyle = LIME
  ctx.beginPath(); ctx.arc(W / 2 - 14 + logoW / 2 + 26, 240, 14, 0, Math.PI * 2); ctx.fill()

  // аватар в лаймовом кольце
  const cx = W / 2, cy = 700, r = 210
  if (avatarImg) {
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip()
    ctx.drawImage(avatarImg, cx - r, cy - r, r * 2, r * 2); ctx.restore()
  } else {
    ctx.fillStyle = '#1C1C22'
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = LIME
    ctx.font = '900 180px Unbounded, sans-serif'
    ctx.fillText((user.display_name || 'D').slice(0, 1).toUpperCase(), cx, cy + 62)
  }
  ctx.strokeStyle = LIME; ctx.lineWidth = 10
  ctx.beginPath(); ctx.arc(cx, cy, r + 14, 0, Math.PI * 2); ctx.stroke()

  // имя и статус
  ctx.fillStyle = WHITE
  ctx.font = '600 76px Onest, sans-serif'
  ctx.fillText(user.display_name || 'user', W / 2, 1060)

  const badge = BADGE_LABEL[user.badge]
  if (badge) {
    ctx.font = '700 38px Onest, sans-serif'
    const bw = ctx.measureText(badge).width + 64
    ctx.strokeStyle = LIME; ctx.lineWidth = 3
    ctx.beginPath(); ctx.roundRect(W / 2 - bw / 2, 1100, bw, 66, 33); ctx.stroke()
    ctx.fillStyle = LIME
    ctx.fillText(badge, W / 2, 1144)
  }

  // очки стиля с монетой
  const score = String(user.style_score ?? 0)
  ctx.font = '900 150px Unbounded, sans-serif'
  const sw = ctx.measureText(score).width
  const R = 62, GAP = 36
  const groupLeft = W / 2 - (R * 2 + GAP + sw) / 2   // монета и число центрируются как одна группа
  coin(ctx, groupLeft + R, 1330, R)
  ctx.textAlign = 'center'
  ctx.fillStyle = LIME
  ctx.fillText(score, groupLeft + R * 2 + GAP + sw / 2, 1380)

  ctx.fillStyle = MUTED
  ctx.font = '400 46px Onest, sans-serif'
  ctx.fillText(t('stat_style_score'), W / 2, 1460)

  // место и образы
  ctx.fillStyle = WHITE
  ctx.font = '700 92px Unbounded, sans-serif'
  ctx.fillText(t('story_rank', { n: rank }), W / 2, 1610)
  ctx.fillStyle = MUTED
  ctx.font = '400 50px Onest, sans-serif'
  ctx.fillText(t('story_looks', { n: postsCount }), W / 2, 1690)

  // ссылка снизу: у каждого своя реферальная, поэтому подгоняем размер под ширину
  const shown = link.replace(/^https?:\/\//, '')
  ctx.fillStyle = MUTED
  let size = 46
  do {
    ctx.font = `500 ${size}px Onest, sans-serif`
    size -= 2
  } while (ctx.measureText(shown).width > W - 120 && size > 26)
  ctx.fillText(shown, W / 2, 1830)
  return c
}

function toBlob(canvas) {
  return new Promise((res, rej) =>
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('blob'))), 'image/png', 0.92))
}

export async function shareRankCard({ user, rank, postsCount, link = BOT_LINK }) {
  if (!tg || !tg.shareToStory) return { ok: false, reason: 'unsupported' }
  let blob
  try {
    // без этого canvas нарисует системным шрифтом вместо Unbounded
    try { await document.fonts.ready } catch { /* не критично */ }
    const avatarImg = user.avatar_url ? await loadImg(user.avatar_url) : null
    try {
      blob = await toBlob(renderStoryCard({ user, rank, postsCount, avatarImg, link }))
    } catch {
      blob = await toBlob(renderStoryCard({ user, rank, postsCount, avatarImg: null, link }))
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

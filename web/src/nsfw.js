// Проверка фото на откровенный контент прямо в браузере (nsfwjs, модель MobileNetV2).
// Грузится лениво, только при публикации: в основной бандл не попадает.
// Правило: модель не должна мешать людям постить — любая её ошибка означает «пропускаем».

const BLOCK_SCORE = 0.75      // Porn + Hentai
const LOAD_TIMEOUT = 12000

let modelPromise = null

// На медленной сети и в экономии трафика модель не тянем: первый пост важнее проверки
function connectionTooSlow() {
  const c = navigator.connection
  if (!c) return false
  return Boolean(c.saveData) || ['slow-2g', '2g'].includes(c.effectiveType)
}

// Прогрев: зовём при открытии композера, пока человек выбирает фото и пишет подпись
export function warmUpNsfw() {
  if (connectionTooSlow()) return
  getModel().catch(() => {})
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms)),
  ])
}

function loadImage(blob) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => res({ img, url })
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image')) }
    img.src = url
  })
}

async function getModel() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await import('@tensorflow/tfjs')
      // только мобильная модель (≈4 МБ): полный пакет тянет ещё две, это 43 МБ
      const [{ load }, { MobileNetV2Model }] = await Promise.all([
        import('nsfwjs/core'),
        import('nsfwjs/models/mobilenet_v2'),
      ])
      return load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] })
    })().catch((e) => { modelPromise = null; throw e })
  }
  return modelPromise
}

// { ok: true } — можно публиковать; { ok: false, score } — откровенный контент
export async function checkPhotos(files) {
  if (connectionTooSlow()) return { ok: true, skipped: true }
  try {
    const model = await withTimeout(getModel(), LOAD_TIMEOUT)
    for (const file of files) {
      const { img, url } = await loadImage(file)
      let preds
      try {
        preds = await withTimeout(model.classify(img), 8000)
      } finally {
        URL.revokeObjectURL(url)
      }
      const by = Object.fromEntries(preds.map((p) => [p.className, p.probability]))
      const score = (by.Porn ?? 0) + (by.Hentai ?? 0)
      if (score >= BLOCK_SCORE) return { ok: false, score: Number(score.toFixed(2)) }
    }
    return { ok: true }
  } catch (e) {
    console.warn('nsfw check skipped:', e?.message)
    return { ok: true, skipped: true }   // молча пропускаем: блокировать из-за сбоя модели нельзя
  }
}

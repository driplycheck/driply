// Кольцо-статус по очкам стиля. Пороги легко крутить позже.
const TIERS = [
  { id: 'base', min: 0 },
  { id: 'bronze', min: 100 },
  { id: 'silver', min: 500 },
  { id: 'gold', min: 2000 },
]

function tierIndex(score = 0) {
  let i = 0
  while (i + 1 < TIERS.length && score >= TIERS[i + 1].min) i++
  return i
}

export function avatarTier(score = 0) {
  return 'tier-' + TIERS[tierIndex(score)].id
}

// { tier, next, pct } — next = null на последнем уровне
export function tierProgress(score = 0) {
  const i = tierIndex(score)
  const tier = TIERS[i]
  const next = TIERS[i + 1] || null
  const pct = next ? Math.round(((score - tier.min) / (next.min - tier.min)) * 100) : 100
  return { tier: tier.id, next: next?.id ?? null, pct: Math.max(0, Math.min(100, pct)), left: next ? next.min - score : 0 }
}

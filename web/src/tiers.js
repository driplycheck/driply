// Кольцо-статус по очкам стиля. Пороги легко крутить позже.
export function avatarTier(score = 0) {
  if (score >= 2000) return 'tier-gold'
  if (score >= 500) return 'tier-silver'
  if (score >= 100) return 'tier-bronze'
  return 'tier-base'
}

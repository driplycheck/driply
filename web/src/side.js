let active = 'right'
export function loadSide() {
  try { return localStorage.getItem('driply_side') || 'right' } catch { return 'right' }
}
export function saveSide(s) {
  try { localStorage.setItem('driply_side', s) } catch {}
}
export function setActiveSide(s) { if (s === 'left' || s === 'right') active = s }
export function getSide() { return active }

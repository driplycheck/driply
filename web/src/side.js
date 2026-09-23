export function loadSide() {
  try { return localStorage.getItem('driply_side') || 'right' } catch { return 'right' }
}
export function saveSide(s) {
  try { localStorage.setItem('driply_side', s) } catch {}
}

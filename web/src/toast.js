// Тост живёт в App, но нужен из любого экрана — поэтому один слушатель вместо проброса пропсов.
let listener = null

export function setToastListener(fn) { listener = fn }

export function toast(text) { listener?.(text) }

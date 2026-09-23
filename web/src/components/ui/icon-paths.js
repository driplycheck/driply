// Единый набор иконок Driply: сетка 24×24, штрих, без заливки.
// Отсюда их берут и приложение (цвет = currentColor, значит тема применяется сама),
// и генератор телеграм-пака (marketing/make-pack.mjs).

export const CATEGORY_ICONS = {
  top: '<path d="M8.5 3.5 5 5.2 2.8 9l2.9 1.6V20.5h12.6V10.6L21.2 9 19 5.2l-3.5-1.7a3.6 3.6 0 0 1-7 0Z"/>',
  bottoms: '<path d="M6.6 3h10.8l.9 17.5h-4.4L12 11.6 10.1 20.5H5.7z"/><path d="M6.9 8.2h10.2"/>',
  shoes: '<path d="M2.8 17.4V12h3.9l3.1-3.4 2.6 2.4 4.6 1.4c2.3.7 3.9 1.6 4.2 2.8v2.2Z"/><path d="M2.8 15.2h18.4"/>',
  accessory: '<path d="M4 14.2a8 8 0 0 1 16 0"/><path d="M4 14.2h16.4a1.8 1.8 0 0 1 0 3.6H4Z"/>',
  dress: '<path d="M9 3.2 12 5.4l3-2.2 2.2 4.2-2.2 2 3 11.2H8l3-11.2-2.2-2z"/>',
  skirt: '<path d="M7.2 8.4h9.6l3 12.1H4.2z"/><path d="M7.2 8.4V5.8h9.6v2.6"/>',
  bag: '<rect x="3.6" y="8.2" width="16.8" height="12.3" rx="2.4"/><path d="M8.8 8.2V6.4a3.2 3.2 0 0 1 6.4 0v1.8"/>',
  other: '<path d="m12 3.2 2 5.6 5.6 2-5.6 2-2 5.6-2-5.6-5.6-2 5.6-2z"/><path d="M18.4 15.6 19.2 18l2.4.8-2.4.8-.8 2.4-.8-2.4-2.4-.8 2.4-.8z"/>',
}

export const STYLE_ICONS = {
  streetwear: '<rect x="2.6" y="8.6" width="18.8" height="3.4" rx="1.7"/><circle cx="7.6" cy="15.6" r="2.2"/><circle cx="16.4" cy="15.6" r="2.2"/>',
  casual: '<path d="M8.5 4 5 5.7 2.8 9.4l2.9 1.6v9.5h12.6V11l2.9-1.6L19 5.7 15.5 4"/><path d="M8.5 4c0 2.6 7 2.6 7 0"/>',
  y2k: '<circle cx="12" cy="12" r="8.6"/><circle cx="12" cy="12" r="2.6"/><path d="M12 3.4a8.6 8.6 0 0 1 6.1 2.5"/>',
  alt: '<path d="M12 20.4 4.6 13a4.4 4.4 0 0 1 6.2-6.2l1.2 1.2 1.2-1.2A4.4 4.4 0 1 1 19.4 13z"/>',
  oldmoney: '<path d="m12 3 7.4 6.2L12 21 4.6 9.2z"/><path d="M4.6 9.2h14.8M12 3l-3.2 6.2L12 21l3.2-11.8z"/>',
  minimal: '<rect x="5" y="5" width="14" height="14" rx="3.4"/>',
  grunge: '<circle cx="8.8" cy="15.4" r="5.6"/><circle cx="8.8" cy="15.4" r="1.8"/><path d="m12.9 11.5 5.9-5.9M16.9 3.8l3.3 3.3"/>',
  techwear: '<circle cx="12" cy="12" r="1.8"/><path d="M15.8 8.2a5.4 5.4 0 0 1 0 7.6M8.2 15.8a5.4 5.4 0 0 1 0-7.6"/><path d="M18.6 5.4a9.4 9.4 0 0 1 0 13.2M5.4 18.6a9.4 9.4 0 0 1 0-13.2"/>',
  gorpcore: '<path d="m2.8 19.4 6.4-9.8 3.8 5 2.6-3.2 5.6 8z"/><path d="m7.1 12.9 2.1 1.5 2-1.5"/>',
  vintage: '<rect x="2.8" y="6.4" width="18.4" height="11.2" rx="2.4"/><circle cx="8.4" cy="12" r="2.2"/><circle cx="15.6" cy="12" r="2.2"/><path d="M10.6 12h2.8"/>',
  preppy: '<path d="m12 4.4 9.4 3.8L12 12 2.6 8.2z"/><path d="M6.4 10.6v4.8c0 1.9 2.5 3.2 5.6 3.2s5.6-1.3 5.6-3.2v-4.8"/>',
  sporty: '<path d="M3.2 9.4v5.2M6.4 7.2v9.6M17.6 7.2v9.6M20.8 9.4v5.2"/><path d="M6.4 12h11.2"/>',
  formal: '<path d="M10.2 8.4 3.2 5.6v12.8l7-2.8zM13.8 8.4l7-2.8v12.8l-7-2.8z"/><rect x="10.2" y="9.4" width="3.6" height="5.2" rx="1.2"/>',
  boho: '<path d="M4.8 19.2C4.8 11.4 11 4.6 19.2 4.6c0 8-6.6 14.6-14.4 14.6z"/><path d="M4.8 19.2 14.6 9.4"/>',
  cottagecore: '<circle cx="12" cy="12" r="2.3"/><circle cx="12" cy="5.6" r="3.1"/><circle cx="18.1" cy="9.8" r="3.1"/><circle cx="15.8" cy="17.2" r="3.1"/><circle cx="8.2" cy="17.2" r="3.1"/><circle cx="5.9" cy="9.8" r="3.1"/>',
  punk: '<path d="M13.4 2.6 5.6 13.4h5.4l-1.4 8 8.2-11.2h-5.6z"/>',
}

// Монета «дрип» — знак валюты. Заливка, а не штрих: он должен читаться как жетон.
export const COIN_ICONS = {
  'coin-tile': { fill: true, svg: '<rect x="1.5" y="1.5" width="21" height="21" rx="6.5" fill="currentColor"/><text x="10" y="13" font-family="Unbounded" font-weight="900" font-size="13" fill="var(--coin-ink, #09090B)" text-anchor="middle" dominant-baseline="central">d</text><circle cx="18.2" cy="16.4" r="2.1" fill="var(--coin-ink, #09090B)"/>' },
  'coin-ring': { fill: true, svg: '<circle cx="12" cy="12" r="10.2" fill="none" stroke="currentColor" stroke-width="2.6"/><text x="12" y="12.6" font-family="Unbounded" font-weight="900" font-size="12" fill="currentColor" text-anchor="middle" dominant-baseline="central">d</text>' },
}

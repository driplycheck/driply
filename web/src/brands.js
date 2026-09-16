// Базовый словарь брендов для автоподбора: своя база вещей пока крошечная,
// без него поле «Бренд» почти всегда отвечает пустотой.
// Второй элемент — кириллическое написание, по нему тоже ищем.
const BRANDS = [
  ['Nike', 'найк'],
  ['Adidas', 'адидас'],
  ['New Balance', 'нью бэланс'],
  ['Puma', 'пума'],
  ['Reebok', 'рибок'],
  ['Asics', 'асикс'],
  ['Converse', 'конверс'],
  ['Vans', 'ванс'],
  ['Jordan', 'джордан'],
  ['Salomon', 'саломон'],
  ['Crocs', 'крокс'],
  ['Birkenstock', 'биркенштоки'],
  ['Dr. Martens', 'мартинсы'],
  ['Timberland', 'тимберленд'],
  ['UGG', 'угги'],
  ['Levi\'s', 'левайс'],
  ['Wrangler', 'вранглер'],
  ['Dickies', 'дикис'],
  ['Carhartt', 'кархарт'],
  ['Stussy', 'стусси'],
  ['Supreme', 'суприм'],
  ['The North Face', 'зе норт фейс'],
  ['Patagonia', 'патагония'],
  ['Columbia', 'коламбия'],
  ['Arc\'teryx', 'арктерикс'],
  ['Stone Island', 'стон айленд'],
  ['C.P. Company', 'сипи компани'],
  ['Champion', 'чемпион'],
  ['Tommy Hilfiger', 'томми хилфигер'],
  ['Calvin Klein', 'кельвин кляйн'],
  ['Ralph Lauren', 'ральф лорен'],
  ['Lacoste', 'лакост'],
  ['Uniqlo', 'юникло'],
  ['Zara', 'зара'],
  ['Bershka', 'бершка'],
  ['Pull&Bear', 'пул энд бир'],
  ['Stradivarius', 'страдивариус'],
  ['H&M', 'эйч энд эм'],
  ['Mango', 'манго'],
  ['COS', 'кос'],
  ['Massimo Dutti', 'массимо дутти'],
  ['Gap', 'гэп'],
  ['Diesel', 'дизель'],
  ['Guess', 'гесс'],
  ['Acne Studios', 'акне студиос'],
  ['Maison Margiela', 'мезон маржела'],
  ['Rick Owens', 'рик оуэнс'],
  ['Balenciaga', 'баленсиага'],
  ['Gucci', 'гуччи'],
  ['Prada', 'прада'],
  ['Miu Miu', 'миу миу'],
  ['Loewe', 'лоэве'],
  ['Bottega Veneta', 'боттега венета'],
  ['Jacquemus', 'жакмюс'],
  ['Loro Piana', 'лоро пиана'],
  ['Tom Ford', 'том форд'],
  ['Versace', 'версаче'],
  ['Off-White', 'офф вайт'],
  ['Palm Angels', 'палм энджелс'],
  ['Trapstar', 'трапстар'],
  ['Corteiz', 'кортеиз'],
  ['Broken Planet', 'брокен пленет'],
  ['Syna World', 'сина ворлд'],
  ['Represent', 'репрезент'],
  ['Befree', 'бифри'],
  ['Gloria Jeans', 'глория джинс'],
  ['O\'stin', 'остин'],
  ['Zarina', 'зарина'],
  ['Love Republic', 'лав репаблик'],
  ['12Storeez', '12сториз'],
  ['Lichi', 'личи'],
  ['Gate31', 'гейт31'],
  ['Anteater', 'антитер'],
  ['Krakatau', 'кракатау'],
  ['Monochrome', 'монохром'],
  ['Sela', 'села'],
  ['Твое', 'твое'],
]

export function matchBrands(term, limit = 6) {
  const needle = term.trim().toLowerCase()
  if (needle.length < 2) return []

  const starts = []
  const contains = []
  for (const [name, alias] of BRANDS) {
    const lower = name.toLowerCase()
    if (lower.startsWith(needle) || alias.startsWith(needle)) starts.push(name)
    else if (lower.includes(needle) || alias.includes(needle)) contains.push(name)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

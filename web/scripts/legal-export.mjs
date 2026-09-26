// Выгружает документы из приложения в обычные файлы: их можно отправить юристу,
// распечатать или приложить к письму. Единственный источник правды — src/legal/docs.js,
// поэтому расхождений между приложением и файлами быть не может.
//
//   node scripts/legal-export.mjs            # положит .md в ../legal/
//   node scripts/legal-export.mjs page.html  # ещё и одну страницу со всеми документами
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { LEGAL, LEGAL_VERSION, OPERATOR } from '../src/legal/docs.js'

const OUT_DIR = fileURLToPath(new URL('../../legal/', import.meta.url))
await mkdir(OUT_DIR, { recursive: true })

const NAMES = {
  ru: { privacy: 'politika-konfidencialnosti', terms: 'usloviya-ispolzovaniya' },
  en: { privacy: 'privacy-policy', terms: 'terms-of-use' },
}

function toMarkdown(doc, lang) {
  const out = [`# ${doc.title}`, '']
  out.push(`_${lang === 'ru' ? 'Обновлено' : 'Updated'}: ${doc.updated} · ${LEGAL_VERSION}_`, '')
  out.push(doc.intro, '')
  for (const s of doc.sections) {
    out.push(`## ${s.h}`, '')
    for (const p of s.p ?? []) out.push(p, '')
    for (const li of s.list ?? []) out.push(`- ${li}`)
    if (s.list) out.push('')
  }
  const contact = OPERATOR.email || OPERATOR.telegram
  out.push('---', '')
  out.push(lang === 'ru'
    ? `Оператор: ${OPERATOR.name || '[НЕ ЗАПОЛНЕНО — название ИП или ООО]'}. Обращения: ${contact}.`
    : `Operator: ${OPERATOR.name || '[TO BE FILLED — legal entity name]'}. Contact: ${contact}.`)
  return out.join('\n')
}

const files = []
for (const lang of Object.keys(LEGAL)) {
  for (const doc of Object.keys(LEGAL[lang])) {
    const name = `${NAMES[lang][doc]}.${lang}.md`
    await writeFile(OUT_DIR + name, toMarkdown(LEGAL[lang][doc], lang) + '\n')
    files.push(name)
  }
}

console.log('Готово:', OUT_DIR)
for (const f of files) console.log(' ·', f)

// --- одна страница со всеми документами: для юриста и для печати ---
const pageOut = process.argv[2]
if (pageOut) {
  const esc = (x) => String(x).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
  const renderDoc = (doc, lang) => `
  <article class="doc">
    <h2>${esc(doc.title)} <span class="lang">${lang.toUpperCase()}</span></h2>
    <p class="meta">${lang === 'ru' ? 'Обновлено' : 'Updated'}: ${esc(doc.updated)} · версия ${esc(LEGAL_VERSION)}</p>
    <p class="intro">${esc(doc.intro)}</p>
    ${doc.sections.map((s) => `
    <section>
      <h3>${esc(s.h)}</h3>
      ${(s.p ?? []).map((p) => `<p>${esc(p)}</p>`).join('')}
      ${s.list ? `<ul>${s.list.map((li) => `<li>${esc(li)}</li>`).join('')}</ul>` : ''}
    </section>`).join('')}
  </article>`

  const html = `<title>Документы Driply</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&display=swap">
<style>
  :root {
    --bg:#FBFAF7; --surface:#FFFFFF; --line:#E4E1DA; --text:#17161A; --text-2:#4A4852; --muted:#8A8894;
    --accent:#6B4CE6; --warn-bg:#FFF6E5; --warn-line:#E8C97A;
    color-scheme: light dark;
  }
  :root:not([data-theme="light"]) { }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg:#121116; --surface:#1A1920; --line:#2C2A33; --text:#F2F1F5; --text-2:#BFBDC8; --muted:#8B8996;
      --accent:#A794FF; --warn-bg:#2A2312; --warn-line:#6B5A22;
    }
  }
  :root[data-theme="dark"] {
    --bg:#121116; --surface:#1A1920; --line:#2C2A33; --text:#F2F1F5; --text-2:#BFBDC8; --muted:#8B8996;
    --accent:#A794FF; --warn-bg:#2A2312; --warn-line:#6B5A22;
  }
  body { margin:0; background:var(--bg); color:var(--text); font-family:'Onest',system-ui,-apple-system,sans-serif; }
  .wrap { max-width: 720px; margin: 0 auto; padding-block: 40px; padding-left: 20px; padding-right: 20px; }
  h1 { font-size: clamp(26px, 6vw, 34px); line-height:1.12; margin:0 0 6px; letter-spacing:-0.02em; text-wrap:balance; }
  .sub { margin:0 0 28px; color:var(--muted); font-size:14px; }
  .note { background:var(--warn-bg); border:1px solid var(--warn-line); border-radius:14px; padding:18px 20px; margin-bottom:34px; }
  .note h2 { margin:0 0 10px; font-size:16px; }
  .note ol { margin:0; padding-left:20px; }
  .note li { margin-bottom:8px; font-size:14px; line-height:1.55; color:var(--text-2); }
  .doc { background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:26px 24px; margin-bottom:22px; }
  .doc h2 { margin:0 0 4px; font-size:21px; letter-spacing:-0.01em; }
  .lang { font-size:11px; font-weight:600; color:var(--muted); border:1px solid var(--line); border-radius:999px; padding:2px 8px; vertical-align:middle; margin-left:6px; }
  .meta { margin:0 0 14px; font-size:12px; color:var(--muted); }
  .intro { margin:0 0 18px; font-size:15px; line-height:1.6; }
  section { margin-top:20px; }
  section h3 { margin:0 0 8px; font-size:15px; }
  section p { margin:0 0 9px; font-size:14px; line-height:1.6; color:var(--text-2); }
  section ul { margin:0; padding-left:20px; }
  section li { font-size:14px; line-height:1.55; color:var(--text-2); margin-bottom:7px; }
  .foot { color:var(--muted); font-size:13px; line-height:1.6; margin-top:10px; }
  @media print { body{background:#fff} .doc{break-inside:auto; border:none; padding:0} .note{border:1px solid #999} }
</style>
<div class="wrap">
  <h1>Документы Driply</h1>
  <p class="sub">Политика конфиденциальности и условия использования · версия ${esc(LEGAL_VERSION)} · для юридической проверки</p>

  <div class="note">
    <h2>Что просим проверить</h2>
    <ol>
      <li><b>Реквизиты оператора не заполнены.</b> Нужны название (ИП или ООО) и адрес для обращений по персональным данным — сейчас в текстах стоит пропуск.</li>
      <li><b>Уведомление Роскомнадзора.</b> Сервис собирает персональные данные через интернет; подавалось ли уведомление об обработке — вне нашей компетенции.</li>
      <li><b>Локализация данных.</b> База и файлы размещены в Supabase (серверы в ЕС). Нужна оценка требования о первичной обработке данных россиян на территории РФ.</li>
      <li><b>Несовершеннолетние.</b> Аудитория 14-21. В документах указано: младше 13 нельзя, с 13 до 18 — с согласия родителей. Просим оценить достаточность такой формулировки и способ получения согласия.</li>
      <li><b>Внутренняя валюта «дрипы».</b> Описана как баллы без денежной ценности, которые нельзя купить, продать или вывести. Просим проверить формулировки на предмет признаков платёжного средства.</li>
      <li><b>Пользовательский контент.</b> Права на фотографии остаются за автором, сервису даётся неисключительная лицензия на показ. Просим проверить объём лицензии и ответственность за съёмку третьих лиц.</li>
      <li><b>Ответственность и подсудность.</b> Разделы об отказе от гарантий и об ограничении ответственности написаны обобщённо, применимое право не указано.</li>
    </ol>
  </div>

  ${renderDoc(LEGAL.ru.privacy, 'ru')}
  ${renderDoc(LEGAL.ru.terms, 'ru')}
  ${renderDoc(LEGAL.en.privacy, 'en')}
  ${renderDoc(LEGAL.en.terms, 'en')}

  <p class="foot">Тексты описывают фактическое поведение приложения: состав данных сверен со схемой базы. Источник — <code>web/src/legal/docs.js</code>, эта страница и файлы .md собираются из него, поэтому расхождений между приложением и документами нет.</p>
</div>`
  await writeFile(pageOut, html)
  console.log('страница:', pageOut)
}

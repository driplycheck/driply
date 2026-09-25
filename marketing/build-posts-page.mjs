// Собирает страницу с постами канала: тексты, превью обложек и эмодзи — всё в одном HTML.
// Картинки встраиваются как data:URI, чтобы страницу можно было открыть где угодно.
//
//   node marketing/build-posts-page.mjs [путь.html]
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const PACK = fileURLToPath(new URL('./tg-pack/', import.meta.url))
const OUT = process.argv[2] || fileURLToPath(new URL('./posts-page.html', import.meta.url))

const img = async (path) => `data:image/png;base64,${(await readFile(PACK + path)).toString('base64')}`

// один источник текстов: правим здесь и пересобираем страницу
const POSTS = [
  {
    no: '01', title: 'Что это вообще', tag: 'В закреп', tagClass: '', pin: true, cover: '01-what',
    emoji: ['coin-tile', 'up'],
    text: `💧 driply — лента образов

выложил лук → тебе кидают дрипы → чем больше дрипов, тем выше ты в рейтинге ⬆️

дрипы нельзя купить. только заработать

@Driplycheckbot`,
    why: 'Главный пост канала. Три строки: что происходит, зачем, куда нажать.',
  },
  {
    no: '02', title: 'Откуда берутся дрипы', tag: 'День 1', tagClass: '', cover: '02-drips',
    emoji: ['coin-tile', 'digit-2', 'digit-0', 'digit-3', 'digit-1', 'digit-5', 'digit-plus'],
    text: `💧 дрипы — валюта стиля

на старте — 200
первый образ — 300
каждый следующий — 100
друг по твоей ссылке — 500
история в сторис — 200, раз в сутки

всё. за деньги дрипы не продаются`,
    why: 'Числа набери фирменными цифрами из пака — пост сразу читается как своё, а не как объявление.',
  },
  {
    no: '03', title: 'Почему оценка тут не лайк', tag: 'День 2', tagClass: 'tag--later', cover: '03-vote',
    emoji: ['coin-tile'],
    text: `«дрипнуть» — это не лайк 💧

ты отдаёшь свои дрипы: 10, 50 или 100
они уходят автору в очки стиля

лайк ничего не стоит, а дрип стоит
поэтому оценке тут можно верить`,
    why: 'Главное отличие от остальных лент. Объясняем до того, как человек потратит баланс.',
  },
  {
    no: '04', title: 'Рейтинг', tag: 'День 3', tagClass: 'tag--later', cover: '04-rank',
    emoji: ['crown', 'up'],
    text: `👑 рейтинг за неделю, месяц и всё время

неделя обнуляется в понедельник — каждый понедельник шанс заново
топ-3 на подиуме, остальные списком
своё место видно всегда, даже если ты сороковой`,
    why: '«Каждый понедельник заново» — причина возвращаться.',
  },
  {
    no: '05', title: 'Что выкладывать', tag: 'День 4', tagClass: 'tag--later', cover: '05-post',
    emoji: ['item-top', 'style-streetwear', 'item-shoes'],
    text: `не нужна студия и фотограф
зеркало, свет, образ — этого хватает

👕 до 3 фото на образ
🛹 до 2 стилей: стритвир, y2k, олд-мани и другие
👟 вещи с ценами — чтобы не спрашивали «где брал»`,
    why: 'Снимает главный барьер: «у меня нет нормальных фото».',
  },
  {
    no: '06', title: 'Приводи своих', tag: 'День 5', tagClass: 'tag--violet', cover: '06-invite',
    emoji: ['coin-tile', 'arrow', 'digit-5'],
    text: `позвал друга — тебе 500, ему 200 💧

падает, когда он выложит первый образ
ссылка: профиль → настройки → реферальная программа ➡️

одному тут скучно, лента живёт с людей`,
    why: 'Условие про первый образ пишем честно: иначе будет ощущение обмана.',
  },
  {
    no: '07', title: 'Тема: тёмная', tag: 'День 6', tagClass: 'tag--later', theme: 'dark', cover: '07a-theme-dark',
    emoji: ['theme-dark', 'coin-dark'],
    text: `⬛ тёмная тема

графит и белый, лайм только на дрипах
стоит по умолчанию, если в телеграме тёмная

настройки → оформление`,
    why: 'Эмодзи ⬛ замени на theme-dark, монету — на coin-dark.',
  },
  {
    no: '08', title: 'Тема: светлая', tag: 'День 7', tagClass: 'tag--later', theme: 'light', cover: '07b-theme-light',
    emoji: ['theme-light', 'coin-light'],
    text: `⬜ светлая тема

бумага вместо чёрного, чёрный текст, один акцент
включается сама, если у тебя светлый телеграм

настройки → оформление`,
    why: 'Карточка показывает цвета этой темы. Монета — coin-light.',
  },
  {
    no: '09', title: 'Тема: цветная', tag: 'День 8', tagClass: 'tag--violet', theme: 'neon', cover: '07c-theme-neon',
    emoji: ['theme-neon', 'coin-neon'],
    text: `🟣 цветная тема

лайм, фиолет и мягкое свечение
для тех, кому тёмная кажется скучной

настройки → оформление
скрин своей темы кидай в комментарии`,
    why: 'Пост под вовлечение: скриншоты в комментариях — контент, который делают за тебя.',
  },
  {
    no: '10', title: 'Призыв', tag: 'День 9', tagClass: 'tag--later', cover: '08-cta',
    emoji: ['coin-tile', 'digit-3', 'digit-0'],
    text: `хватит читать

открывай, выкладывай первый образ, забирай 300 💧
это минута, если фото уже есть

@Driplycheckbot`,
    why: 'Последний пост серии. Дальше канал живёт образами недели.',
  },
]

// Апдейты продукта: новые сверху. Добавляем сюда после каждой заметной работы по мини-аппу.
const UPDATES = [
  {
    no: 'NEW', title: 'driply 3 — сводный патч', tag: 'Главный пост', tagClass: 'tag--violet', cover: 'u12-v3',
    emoji: ['digit-3', 'check', 'coin-tile'],
    text: `вышла driply 3 ✅

<b>починили</b>
— регистрация больше не появляется у тех, кто давно зарегистрирован: приложение путало «не смог загрузить» и «тебя нет»
— перестало обрезаться нижнее содержимое на экранах правки профиля, настроек и композера
— экраны за настройками перестали выглядеть частью другого приложения

<b>стало лучше</b>
— образ занимает три четверти экрана: убрали пустую полосу и свернули фильтр стилей в кнопку
— вещи и цены при публикации открыты сразу, а не спрятаны за переключателем
— образ можно поправить после публикации: подпись, стили, вещи
— настройки собраны заново, с иконками
— видно, сколько мест со статусом first drip ещё свободно

<b>появилось</b>
— поддержка прямо в приложении: настройки → поддержка, три типа обращений
— ответ приходит сообщением от бота

пиши, если что-то ведёт себя странно — читаю лично 💧`,
    why: 'Сводный пост по версии 3. Правило: сначала честно о починенном, потом о новом — так доверия больше, чем от одних анонсов.',
  },
  {
    no: 'NEW', title: 'Образы крупнее, вещи на виду', tag: 'Готов к посту', tagClass: '', cover: 'u11-bigger',
    emoji: ['item-top', 'coin-tile', 'check'],
    text: `лента стала больше про фото 👕

образ теперь занимает три четверти экрана вместо половины: убрали пустую полосу снизу и свернули фильтр стилей в одну кнопку

и главное — при публикации поле для вещей открыто сразу, а не спрятано за переключателем. бренд, модель, цена

вещи с ценами это то, ради чего сюда возвращаются: «где брал» спрашивают чаще всего ✅`,
    why: 'Из 14 образов вещи были указаны у 3, цены — ни у одного. Не потому что не хотят, а потому что форма была спрятана. Пост объясняет, зачем её заполнять.',
  },
  {
    no: 'NEW', title: 'Правка образа после поста', tag: 'Готов к посту', tagClass: 'tag--violet', cover: 'u10-edit',
    emoji: ['check', 'item-top', 'coin-tile'],
    text: `забыл написать бренд — теперь не беда ✅

образ можно поправить после публикации: профиль → архив → изменить

меняются подпись, стили и вещи. фото остаётся прежним — за него уже отдали дрипы, подменять картинку под чужими голосами нечестно

то же самое доступно прямо из открытого образа, кнопкой слева сверху`,
    why: 'Снимает страх «выложу криво — переделывать нечем». Заодно объясняет, почему фото заморожено — правило честнее, когда названо вслух.',
  },
  {
    no: 'NEW', title: 'Счётчик мест first drip', tag: 'Готов к посту', tagClass: 'tag--violet', cover: 'u5-firstdrip',
    emoji: ['crown', 'digit-5', 'digit-0', 'coin-tile'],
    text: `сколько мест осталось — теперь видно 👑

статус FIRST DRIP получают первые 50 авторов, и бот показывает точное число свободных мест: в первом сообщении и на экране, где выкладываешь первый образ

число живое, оно уже не вырастет обратно

@Driplycheckbot`,
    why: 'Дефицит работает, только когда он измеримый. «Первым 50» — абстракция, «осталось 42 места» — причина выложить образ сегодня.',
  },
  {
    no: 'NEW', title: 'Поддержка внутри приложения', tag: 'Готов к посту', tagClass: '', cover: 'u9-support',
    emoji: ['check', 'arrow'],
    text: `теперь можно написать напрямую ➡️

настройки → поддержка. выбираешь, о чём речь:

🛠 не работает — баг, что-то не грузится
💡 идея — что добавить или изменить
🤝 сотрудничество — если есть что предложить

читаю лично, отвечаю сообщением от бота ✅

чем конкретнее напишешь, тем быстрее починю`,
    why: 'Раньше «Поддержка» просто открывала бота, а бот молчал на обычные сообщения. Три типа обращений заодно открывают дверь для идей и коллабораций — на этой стадии обратная связь ценнее фич.',
  },
  {
    no: 'NEW', title: 'Правила и жалобы', tag: 'Готов к посту', tagClass: 'tag--violet', cover: 'u8-rules',
    emoji: ['check', 'fire'],
    text: `про порядок в ленте ✅

жалоба на образ — три тапа: флажок на карточке, причина, готово
пожаловался — этот образ у тебя больше не появится
жалобы разбираются вручную, за повторные нарушения скрываются все образы автора

откровенные фото приложение теперь отсекает само, ещё до публикации

driply — про стиль. остальное тут лишнее`,
    why: 'Задаёт правила до того, как они понадобятся. Для аудитории 14–21 это важнее, чем кажется.',
  },
  {
    no: 'NEW', title: 'Новая карточка сторис', tag: 'Готов к посту', tagClass: '', cover: 'u7-storycard',
    emoji: ['item-top', 'coin-tile', 'crown'],
    text: `карточка для сторис теперь с твоим образом 👕

раньше уходила табличка с цифрами, теперь — сам лук во весь экран
поверх: ник, статус, место в рейтинге и дрипы
ссылка на карточке твоя, реферальная

профиль → пригласить → в историю`,
    why: 'Показывает главное: мы про образы. Такую историю выкладывают, табличку — нет.',
  },
  {
    no: 'NEW', title: 'Карточка в сторис', tag: 'Готов к посту', tagClass: 'tag--violet', cover: 'u6-story',
    emoji: ['coin-tile', 'arrow', 'crown'],
    text: `выложи свою карточку в сторис 💧

в профиле → пригласить → в историю
на карточке твоё место, очки стиля и статус
ссылка в ней — твоя личная: кто перейдёт и выложит образ, принесёт тебе 500

плюс 200 дрипов за саму историю, раз в сутки`,
    why: 'Связывает историю и рефералку: один жест приносит и дрипы, и людей. Лучший из наших способов раскрутки.',
  },
  {
    no: 'NEW', title: 'Статус first drip', tag: 'Готов к посту', tagClass: '', cover: 'u5-firstdrip',
    emoji: ['coin-tile', 'crown', 'check'],
    text: `статус для первых 💧

выложил образ и попал в первые 50 авторов — в профиле навсегда остаётся статус first drip
он же уходит в карточку, которой делишься в сторис

мест всего 50, дальше статус не выдаётся никому`,
    why: 'Дефицит + статус навсегда. Повод выложить образ сегодня, а не потом. Точное число свободных мест бот показывает в /start и на экране первого образа.',
  },
  {
    no: 'NEW', title: 'Иконки и плавность', tag: 'Готов к посту', tagClass: '', cover: 'u4-icons',
    emoji: ['style-streetwear', 'style-y2k', 'item-shoes'],
    text: `обновили приложение 🛹

у каждого стиля и каждой вещи теперь своя иконка вместо стандартных эмодзи — и они меняются вместе с темой
экраны открываются и закрываются плавно, без рывка
лента больше не моргает при переключении «для тебя» и «подписки»

мелочи, но приложение стало ощущаться нормальным`,
    why: 'Про внешний вид и ощущение — то, что люди замечают сразу. Про кэш и анимации словами разработчика не пишем.',
  },
  {
    no: 'NEW', title: 'Черновик образа', tag: 'Готов к посту', tagClass: 'tag--later', cover: 'u3-draft',
    emoji: ['item-top', 'check'],
    text: `вышел из создания образа — и всё пропало? больше нет ✅

подпись, стили и вещи сохраняются сами
вернёшься — продолжишь с того же места, кнопка «начать заново» рядом

фото пока не сохраняется: его нужно выбрать заново`,
    why: 'Честно говорим про ограничение с фото — иначе первое же возвращение разочарует.',
  },
  {
    no: 'NEW', title: 'Рейтинг по неделям', tag: 'Готов к посту', tagClass: 'tag--violet', cover: 'u2-week',
    emoji: ['crown', 'up', 'coin-tile'],
    text: `рейтинг теперь не один, а три 👑

неделя, месяц и всё время
неделя обнуляется в понедельник — прошлое не тянется за тобой, каждый понедельник шанс заново
видно, на сколько мест ты поднялся за сутки, и сколько дрипов пришло сегодня

в топ-3 попасть за неделю реально, попробуй`,
    why: 'Главный крючок на возвращение. «Попасть в топ-3 за неделю реально» — призыв, который работает при малом числе людей.',
  },
  {
    no: 'NEW', title: 'Три фото и цены', tag: 'Готов к посту', tagClass: 'tag--later', cover: 'u1-photos',
    emoji: ['item-top', 'item-shoes', 'coin-tile'],
    text: `образ теперь показывается целиком 👕

до 3 фото — общий план, детали, обувь
до 2 стилей на образ: стритвир + y2k, как есть
цены вещей — подписчики сразу видят, где брал и за сколько

цена необязательная, но с ней образ собирают чаще`,
    why: 'Самое заметное обновление продукта. Ставим первым, если постишь апдейты пачкой.',
  },
]

const DIGITS = [...'0123456789'].map((d) => `digit-${d}`).concat(['digit-plus', 'digit-x'])

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Приглашения: личные сообщения и тексты для чатов. Обложек им не нужно.
const INVITES = [
  {
    title: 'Личное сообщение другу',
    tag: 'Самое рабочее',
    text: `делаю приложение про образы — driply

выкладываешь лук, тебе кидают дрипы, по ним рейтинг. купить их нельзя, только заработать

сейчас там мало людей, и мне нужны нормальные образы для старта. глянешь? на старте дам 200 дрипов, за первый образ ещё 300

<ссылка из профиля → пригласить>`,
    why: 'Первые двадцать человек приходят не из рекламы, а лично. Работает, если честно сказать, что людей мало и нужна помощь, а не делать вид, что это большой сервис.',
  },
  {
    title: 'Сообщение в тематический чат',
    tag: 'Осторожно',
    text: `сделал мини-апп про уличный стиль: выкладываешь образ, другие кидают внутреннюю валюту, по ней рейтинг недели

дрипы нельзя купить за деньги — только заработать, поэтому оценка кое-что значит

людей пока мало, ищу тех, кому интересно быть в начале
t.me/Driplycheckbot`,
    why: 'В чаты идти только туда, где тема совпадает, и только с одним сообщением. Ссылку давать общую, не реферальную: в чатах реферальная выглядит как заработок на людях.',
  },
  {
    title: 'Подпись к сторис',
    tag: 'К карточке',
    text: `мой образ в driply

выкладывай свой — за первый дают 300 💧
ссылка в карточке`,
    why: 'Карточку приложение рисует само: профиль → пригласить → в историю. В ней уже стоит личная ссылка, за перешедшего и выложившего образ придёт 500.',
  },
  {
    title: 'Пост-приглашение в канал',
    tag: 'Готов к посту',
    text: `в driply осталось 41 место со статусом FIRST DRIP 👑

его получают первые 50 авторов — дальше не выдаётся никому и никогда

выложить образ — минута, если фото уже есть. за первый дают 300 💧

@Driplycheckbot`,
    why: 'Дефицит работает, когда он измеримый и правдивый. Число живое: оно уменьшается с каждым новым автором и обратно не растёт.',
  },
]

async function renderCards(list) {
  const out = []
  for (const p of list) {
  const cover = await img(`covers-preview/${p.cover}.png`)
  const chips = await Promise.all(p.emoji.map(async (id) => `<img class="chip" src="${await img(`emoji/${id}.png`)}" alt="${id}" title="${id}">`))
    out.push(`
    <article class="post ${p.pin ? 'post--pin' : ''} ${p.theme ? `post--${p.theme}` : ''}">
      <img class="cover" src="${cover}" alt="обложка поста ${p.no}">
      <div class="post__head"><span class="post__no">${p.no}</span><span class="post__title">${esc(p.title)}</span><span class="tag ${p.tagClass}">${esc(p.tag)}</span></div>
      <div class="post__text">${esc(p.text)}</div>
      <div class="post__emoji">${chips.join('')}<span class="emoji-hint">эмодзи из пака</span></div>
      <div class="post__foot"><span class="why">${esc(p.why)}</span><span class="file">${p.cover}.png</span><button type="button" data-copy>Копировать</button></div>
    </article>`)
  }
  return out
}

// у приглашений нет обложек и эмодзи — карточка проще
const inviteCards = INVITES.map((p) => `
    <article class="post post--plain">
      <div class="post__head"><span class="post__title">${esc(p.title)}</span><span class="tag">${esc(p.tag)}</span></div>
      <div class="post__text">${esc(p.text)}</div>
      <div class="post__foot"><span class="why">${esc(p.why)}</span><button type="button" data-copy>Копировать</button></div>
    </article>`)

const cards = await renderCards(POSTS)
const updateCards = await renderCards(UPDATES)

const digitChips = await Promise.all(DIGITS.map(async (id) => `<img class="chip chip--lg" src="${await img(`emoji/${id}.png`)}" alt="${id}">`))

const html = `<title>Стартовые посты Driply</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Onest:wght@400;500;600;700&family=Unbounded:wght@700;900&display=swap">
<style>
  :root {
    --bg:#09090B; --surface:#141418; --surface-2:#1C1C22; --line:rgba(255,255,255,.09);
    --text:#F5F5F7; --text-2:#B8B8C4; --muted:#8A8A96;
    --drip:#C6FF3D; --violet:#7C5CFF; --pink:#FF4D8D;
    --display:'Unbounded','Arial Black',system-ui,sans-serif; --body:'Onest',system-ui,-apple-system,sans-serif;
  }
  body{margin:0;background:var(--bg);color:var(--text);font-family:var(--body);font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased}
  .wrap{max-width:820px;margin:0 auto;padding-block:40px 72px;padding-left:16px;padding-right:16px}
  header{display:flex;flex-direction:column;gap:14px}
  .logo{display:inline-flex;align-items:flex-end;gap:5px;font-family:var(--display);font-weight:900;font-size:clamp(30px,8vw,40px);letter-spacing:-.03em}
  .logo i{width:10px;height:10px;margin-bottom:6px;border-radius:50%;background:var(--drip)}
  .lede{max-width:62ch;color:var(--text-2)} .lede b{color:var(--text);font-weight:600}
  .plan{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:26px}
  .plan div{padding:14px 16px;border-radius:16px;background:var(--surface);border:1px solid var(--line)}
  .plan b{display:block;font-family:var(--display);font-weight:700;font-size:14px;margin-bottom:4px}
  .plan span{color:var(--muted);font-size:13px;line-height:1.4}

  .digits{margin-top:26px;padding:18px 20px;border-radius:20px;background:var(--surface);border:1px solid var(--line)}
  .digits h2{font-family:var(--display);font-weight:700;font-size:15px;margin:0 0 4px}
  .digits p{margin:0 0 14px;color:var(--muted);font-size:13px;line-height:1.45}
  .digits .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}

  .posts{display:flex;flex-direction:column;gap:18px;margin-top:32px}
  .post{--card:var(--surface);--card-line:var(--line);--card-text:var(--text);--card-muted:var(--muted);--card-quote:var(--bg);
    background:var(--card);border:1px solid var(--card-line);border-radius:22px;overflow:hidden;color:var(--card-text)}
  .post--pin{--card-line:rgba(198,255,61,.45)}
  .post--dark{--card:#0A0A0A;--card-quote:#141414;--card-line:rgba(255,255,255,.14);--card-text:#F5F5F5;--card-muted:#8A8A8A}
  .post--light{--card:#F3F1EC;--card-quote:#FFFFFF;--card-line:rgba(17,17,17,.14);--card-text:#111111;--card-muted:#7A766E}
  .post--neon{--card:#141418;--card-quote:#09090B;--card-line:rgba(124,92,255,.5)}
  .cover{display:block;width:100%;height:auto;border-bottom:1px solid var(--card-line)}
  .post__head{display:flex;align-items:baseline;gap:10px;flex-wrap:wrap;padding:16px 18px 0}
  .post__no{font-family:var(--display);font-weight:900;font-size:13px;color:var(--card-muted);font-variant-numeric:tabular-nums}
  .post__title{font-family:var(--display);font-weight:700;font-size:16px}
  .tag{margin-left:auto;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#09090B;background:var(--drip)}
  .tag--later{background:var(--surface-2);color:var(--text-2)}
  .post--light .tag--later{background:rgba(17,17,17,.08);color:#5E5A52}
  .tag--violet{background:var(--violet);color:#fff}
  .post__text{margin:14px 18px 0;padding:16px 18px;border-radius:16px;background:var(--card-quote);border:1px solid var(--card-line);white-space:pre-wrap;font-size:15px;line-height:1.6}
  .post__emoji{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:12px 18px 0}
  .chip{width:24px;height:24px}
  .chip--lg{width:34px;height:34px}
  .emoji-hint{font-size:12px;color:var(--card-muted)}
  .post__foot{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 18px 18px}
  .why{flex:1 1 240px;min-width:0;color:var(--card-muted);font-size:13px;line-height:1.45}
  .file{display:inline-block;padding:3px 9px;border-radius:8px;background:var(--card-quote);border:1px solid var(--card-line);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;color:var(--card-muted)}
  button{flex:none;padding:9px 16px;border-radius:999px;border:none;background:var(--drip);color:#09090B;font-family:var(--body);font-weight:700;font-size:13px;cursor:pointer;transition:transform .12s ease,filter .2s ease}
  .post--light button{background:#111;color:#F3F1EC}
  button:hover{filter:brightness(1.08)} button:active{transform:scale(.96)}
  button:focus-visible{outline:2px solid var(--violet);outline-offset:2px}
  .note{margin-top:32px;padding:20px 22px;border-radius:20px;background:linear-gradient(120deg,rgba(124,92,255,.18),rgba(255,77,141,.1));border:1px solid rgba(124,92,255,.35)}
  .note h2{font-family:var(--display);font-weight:700;font-size:16px;margin:0 0 10px}
  .note ul{margin:0;padding-left:18px;color:var(--text-2);font-size:14px;line-height:1.6}
  .note li+li{margin-top:6px}
  .note code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;color:var(--drip)}
  .section{font-family:var(--display);font-weight:700;font-size:18px;margin:36px 0 4px}
  .post--plain{padding-top:18px}
  .section__note{margin:0;color:var(--muted);font-size:13px;line-height:1.45}
  @media (prefers-reduced-motion:reduce){button{transition:none}}
</style>

<div class="wrap">
  <header>
    <span class="logo">driply<i></i></span>
    <p class="lede">Посты для канала: текст, обложка и эмодзи к каждому. Сверху — <b>апдейты продукта</b>, ниже — серия на запуск. Файлы обложек лежат в <b>marketing/tg-pack/covers</b>.</p>
  </header>

  <div class="plan">
    <div><b>День 1</b><span>Посты 1 и 2. Первый — в закреп.</span></div>
    <div><b>Дни 2–4</b><span>Оценка, рейтинг, что выкладывать.</span></div>
    <div><b>Дни 5–8</b><span>Рефералка и три поста про темы.</span></div>
    <div><b>День 9</b><span>Призыв. Дальше — образ недели.</span></div>
  </div>

  <div class="digits">
    <h2>Фирменные цифры</h2>
    <p>Для чисел экономики во втором посте и везде, где числа — главное. Набираешь 2️⃣0️⃣0️⃣, Telegram подставляет эти.</p>
    <div class="row">${digitChips.join('')}</div>
  </div>

  <h2 class="section">Приглашения</h2>
  <p class="section__note">Первые двадцать-тридцать человек приходят вручную. Личное сообщение — самое рабочее, чаты — осторожно и по одному сообщению, сторис — через карточку из приложения.</p>
  <div class="posts">${inviteCards.join('')}
  </div>

  <h2 class="section">Апдейты продукта</h2>
  <p class="section__note">Свежие сверху. Появляются после каждой заметной работы по приложению — постить можно по одному, когда есть повод.</p>
  <div class="posts">${updateCards.join('')}
  </div>

  <h2 class="section">Серия на запуск</h2>
  <p class="section__note">Десять постов по порядку: первый в закреп, дальше по одному в день.</p>
  <div class="posts">${cards.join('')}
  </div>

  <div class="note">
    <h2>Как оформлять</h2>
    <ul>
      <li><b>Эмодзи в текстах обычные.</b> Когда пак добавлен, Telegram при вводе 💧 👑 ⬛ 2️⃣ сам предлагает кастомный из Driply. Вставляет аккаунт с Premium, видят все.</li>
      <li><b>Монеты под темы:</b> <code>coin-tile</code> лайм, <code>coin-dark</code> белая, <code>coin-light</code> чёрная, <code>coin-neon</code> с фиолетовой точкой. В посте про тему бери монету той же темы.</li>
      <li>Обложку прикрепляй картинкой, текст — подписью. Имя файла указано на карточке.</li>
      <li>Комментарии включи до поста про цветную тему.</li>
      <li>Дальше канал ведут образы: раз в неделю лучший образ из рейтинга, с ником автора.</li>
    </ul>
  </div>
</div>

<script>
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.closest('.post').querySelector('.post__text').innerText;
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = 'Скопировано';
      } catch (e) {
        const range = document.createRange();
        range.selectNodeContents(btn.closest('.post').querySelector('.post__text'));
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
        btn.textContent = 'Выдели и скопируй';
      }
      setTimeout(() => { btn.textContent = 'Копировать'; }, 2000);
    });
  });
</script>
`

await writeFile(OUT, html)
console.log(`страница собрана: ${OUT} (${(html.length / 1024 / 1024).toFixed(2)} МБ, постов: ${POSTS.length})`)

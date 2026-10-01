// Кнопки под сообщениями — свои для каждой темы.
//
// Почему именно так: меню «/» Telegram умеет настраивать только на весь чат целиком,
// темы внутри группы оно не различает. Поэтому команды в меню — общие на группу,
// а всё, что должно отличаться от темы к теме, живёт кнопками в самих сообщениях.
//
// Что делает кнопка, записано в callback_data (у Telegram на неё 64 байта):
//   run:<агент>:<заготовка> — запустить агента с готовой задачей
//   stats:<срез>            — показать цифры сразу, без прогона подписки
//   do:<действие>           — health, posts, publish, fix, menu

export type Button = { text: string; data: string }
export type Panel = { title: string; rows: Button[][] }

// Панель темы: что видно, когда зовёшь /menu внутри неё.
export const PANELS: Record<string, Panel> = {
  tester: {
    title: '🧪 <b>Тестировщик</b> — что проверить',
    rows: [
      [{ text: '🔍 Проверить прод', data: 'run:tester:audit' }],
      [{ text: '📸 Посмотреть экраны', data: 'run:tester:screens' }],
      [{ text: '⚠️ Ошибки у людей', data: 'stats:errors' }],
    ],
  },
  designer: {
    title: '🎨 <b>Дизайнер</b> — на что посмотреть',
    rows: [
      [{ text: '👀 Разбор экранов', data: 'run:designer:review' }],
      [{ text: '🌗 Светлая тема', data: 'run:designer:light' }],
      [{ text: '📱 Короткий экран', data: 'run:designer:short' }],
    ],
  },
  dev: {
    title: '🔧 <b>Разработчик</b> — что починить',
    rows: [
      [{ text: '🛠 Взять последний разбор', data: 'run:dev:last' }],
    ],
  },
  analyst: {
    title: '📊 <b>Аналитик</b> — какие цифры',
    rows: [
      [{ text: '📈 Рост', data: 'stats:growth' }, { text: '🧭 Воронка', data: 'stats:funnel' }],
      [{ text: '🔁 Возвраты', data: 'stats:retention' }, { text: '💧 Экономика', data: 'stats:economy' }],
      [{ text: '🧠 Итоги недели с выводом', data: 'run:analyst:week' }],
    ],
  },
  pr: {
    title: '📣 <b>PR-менеджер</b> — что сделать',
    rows: [
      [{ text: '✍️ Новый пост с обложкой', data: 'run:pr:post' }],
      [{ text: '📚 Что уже опубликовано', data: 'do:posts' }],
    ],
  },
  // Переговорка: отсюда дёргаем кого угодно, поэтому панель самая широкая.
  meeting: {
    title: '🤖 <b>Совещание</b> — позвать или посмотреть',
    rows: [
      [{ text: '🧪 Аудит', data: 'run:tester:audit' }, { text: '🎨 Дизайн', data: 'run:designer:review' }],
      [{ text: '📊 Итоги недели', data: 'run:analyst:week' }, { text: '✍️ Пост', data: 'run:pr:post' }],
      [{ text: '📈 Рост', data: 'stats:growth' }, { text: '🧭 Воронка', data: 'stats:funnel' }],
      [{ text: '❤️ Состояние', data: 'do:health' }, { text: '📚 Публикации', data: 'do:posts' }],
    ],
  },
  // Темы поддержки и всё остальное: здесь агентов не зовут, нужны только быстрые справки.
  support: {
    title: '<b>Быстрые справки</b>',
    rows: [
      [{ text: '❤️ Состояние', data: 'do:health' }, { text: '📈 Рост', data: 'stats:growth' }],
      [{ text: '⚠️ Ошибки у людей', data: 'stats:errors' }],
    ],
  },
}

// Кнопки под готовым ответом агента: действуют на то самое сообщение, а не вообще.
export const REPORT_BUTTONS: Record<string, Button[][]> = {
  tester: [[{ text: '🔧 Починить это', data: 'do:fix' }, { text: '🔁 Перепроверить', data: 'run:tester:audit' }]],
  designer: [[{ text: '🔧 Починить это', data: 'do:fix' }]],
  pr: [[{ text: '📣 Опубликовать', data: 'do:publish' }, { text: '🔁 Другой вариант', data: 'run:pr:post' }]],
  analyst: [[{ text: '✍️ Сделать из этого пост', data: 'run:pr:post' }]],
}

// Текст задачи, который уходит агенту при нажатии. Это обычное сообщение основателя,
// поэтому пишем его так, как написал бы человек.
export const PRESETS: Record<string, string> = {
  'tester:audit':
    'Прогони полную проверку прода, контракты и линтер, посмотри ошибки у людей за сутки. Коротко: что работает, что сломано, что тревожит.',
  'tester:screens':
    'Посмотри снятые экраны и скажи, не поехало ли что-то. Начни с короткого экрана и светлой темы. Тесты гонять не надо.',
  'designer:review':
    'Посмотри экраны и скажи, что выглядит плохо. Не больше трёх замечаний, самое заметное первым.',
  'designer:light':
    'Посмотри только светлую тему. Контраст, читаемость подписей, не пропало ли что-то, что видно в тёмной.',
  'designer:short':
    'Посмотри только короткий экран. Ищи наложения и обрезанное: на высоком телефоне этого не видно.',
  'dev:last':
    'Возьми последний разбор тестировщика и дизайнера (node .github/scripts/ask.mjs history tester 3 и history designer 3), выбери одну подтверждённую поломку и почини её минимальной правкой в отдельной ветке. Открой пулл-реквест. Если чинить нечего — так и скажи.',
  'analyst:week':
    'Итоги недели. Возьми срезы growth, funnel, retention, content, economy за 7 дней и сравни с прошлой неделей. Что требует действия, а что шум малых чисел.',
  'pr:post':
    'Пришли один готовый пост для канала с обложкой. Сначала посмотри, что уже присылал и что уже опубликовано, не повторяйся ни темой, ни зачином.',
}

export function markup(rows: Button[][]) {
  return { inline_keyboard: rows.map((r) => r.map((b) => ({ text: b.text, callback_data: b.data }))) }
}

// Тексты политики и условий. Держим их кодом, а не в i18n: это цельные документы,
// у них есть версия, и менять их построчно нельзя — только целиком, с новой датой.
//
// ВАЖНО: перед публикацией документы должен просмотреть юрист. Здесь описано ровно то,
// что приложение делает на самом деле (состав данных сверен со схемой базы), но
// юридические формулировки, реквизиты оператора и уведомление Роскомнадзора — вне кода.

export const LEGAL_VERSION = '2026-09-26'

// Заполняется владельцем сервиса. Пока не заполнено, в документах стоит явная пометка.
export const OPERATOR = {
  name: '',            // ИП Иванов И. И. / ООО «Название»
  email: '',           // почта для обращений по персональным данным
  telegram: '@Driplycheckbot',
}

const PRIVACY_RU = {
  title: 'Политика конфиденциальности',
  updated: '26 сентября 2026',
  intro:
    'Этот документ объясняет, какие данные Driply собирает, зачем, сколько хранит, кому передаёт и что ты можешь с ними сделать. Написан по тому, как приложение работает на самом деле — состав данных сверен с базой.',
  sections: [
    {
      h: '1. Кто обрабатывает данные',
      p: [
        'Оператор — владелец сервиса Driply (мини-приложение в Telegram и бот @Driplycheckbot).',
        'Вопросы по данным, удалению аккаунта и жалобы: напиши в приложении «Настройки → Поддержка» или боту @Driplycheckbot. Мы отвечаем сообщением от бота.',
      ],
    },
    {
      h: '2. Какие данные мы получаем',
      list: [
        'От Telegram при запуске: твой идентификатор Telegram, имя, @username (если он есть), ссылка на аватар, язык интерфейса. Мы не получаем твой номер телефона, список контактов и переписку.',
        'Что ты вводишь сам: ник в Driply, описание «о себе», пол (по желанию), фотографии образов, подписи к ним, названия и бренды вещей, цены, выбранные стили.',
        'Что возникает от использования: твои оценки (сколько дрипов и кому), баланс дрипов, очки стиля, подписки и подписчики, чёрный список, жалобы, обращения в поддержку.',
        'Технические события: открытие приложения, начало создания образа, публикация, ошибки в работе приложения. Они нужны, чтобы понимать, где приложение ломается или неудобно.',
        'Мы не собираем геолокацию, не читаем буфер обмена, не используем рекламные идентификаторы и не покупаем данные о тебе у третьих лиц.',
      ],
    },
    {
      h: '3. Зачем мы это обрабатываем',
      list: [
        'Чтобы сервис работал: показывать ленту, профиль, рейтинг, начислять и списывать дрипы.',
        'Чтобы поддерживать порядок: рассматривать жалобы, скрывать нарушающий контент, ограничивать доступ нарушителям.',
        'Чтобы отвечать на твои обращения в поддержку.',
        'Чтобы улучшать приложение: понимать, на каком шаге люди бросают публикацию и какие ошибки возникают.',
        'Чтобы присылать уведомления, которые ты сам не отключил в настройках.',
        'Мы не используем твои данные для рекламы и не передаём их рекламодателям.',
      ],
    },
    {
      h: '4. На каком основании',
      p: [
        'Мы обрабатываем данные на основании твоего согласия, которое ты даёшь при регистрации, и постольку, поскольку это необходимо для работы сервиса, которым ты пользуешься.',
        'Согласие можно отозвать в любой момент — удалив аккаунт (см. раздел 8). Часть данных при этом сохраняется в обезличенном виде, об этом ниже.',
      ],
    },
    {
      h: '5. Что видят другие люди',
      list: [
        'Публично в приложении: твой ник, аватар, описание, пол (если указал), статус и значки, очки стиля, место в рейтинге, опубликованные образы с подписями, вещами и ценами, число подписчиков и подписок.',
        'Твой @username виден другим, только если ты не включил «Скрывать @username» в настройках профиля.',
        'Не видит никто, кроме нас: твой идентификатор Telegram, баланс дрипов, за кого именно ты голосовал, кого заблокировал, твои жалобы и переписка с поддержкой.',
        'Жалобы анонимны: автор образа не узнает, кто на него пожаловался.',
      ],
    },
    {
      h: '6. Кому мы передаём данные',
      list: [
        'Telegram — платформа, в которой работает приложение. Отправка уведомлений и ответов поддержки идёт через Telegram по правилам Telegram.',
        'Supabase — хостинг базы данных и файлов (серверы в Европейском союзе). Там хранятся аккаунты, образы и служебные данные.',
        'Vercel — хостинг самого приложения (раздача интерфейса).',
        'Государственным органам — только по обоснованному законному требованию.',
        'Мы не продаём данные, не передаём их рекламным сетям и не используем сторонние трекеры аналитики: статистика считается в нашей собственной базе.',
      ],
    },
    {
      h: '7. Сколько храним',
      list: [
        'Аккаунт и образы — пока существует аккаунт.',
        'Скрытые и удалённые образы — удаляются из ленты сразу; файлы фотографий удаляются в срок до 30 дней.',
        'Обращения в поддержку — до 1 года, чтобы можно было вернуться к истории спора.',
        'Жалобы и решения по ним — до 1 года, чтобы видеть повторные нарушения.',
        'Технические события — до 12 месяцев, дальше остаётся только обезличенная статистика без привязки к человеку.',
      ],
    },
    {
      h: '8. Твои права',
      list: [
        'Посмотреть и изменить свои данные — в приложении, «Настройки → Редактировать профиль».',
        'Скрыть или удалить любой свой образ — в «Архиве» образов.',
        'Удалить аккаунт целиком вместе с образами, оценками и подписками — напиши в поддержку, мы удалим в течение 30 дней и подтвердим сообщением.',
        'Получить копию своих данных, уточнить их или отозвать согласие — через поддержку.',
        'Пожаловаться на то, как мы обращаемся с данными, — сначала нам, а если ответ не устроит, в надзорный орган по месту жительства.',
      ],
    },
    {
      h: '9. Возраст',
      p: [
        'Driply не предназначен для детей младше 13 лет, и мы сознательно не собираем их данные. Если тебе меньше 13 — не пользуйся сервисом.',
        'Если тебе от 13 до 18 лет, пользуйся Driply с согласия родителей или другого законного представителя.',
        'Если мы узнаем, что аккаунтом пользуется ребёнок младше 13 лет, мы удалим аккаунт и связанные данные. Сообщить о таком аккаунте можно через поддержку.',
      ],
    },
    {
      h: '10. Как мы защищаем данные',
      list: [
        'Приложение не обращается к базе напрямую: любые изменения проходят через сервер, который проверяет подпись Telegram — от твоего имени нельзя действовать без твоей сессии.',
        'Приватные поля профиля и служебные таблицы закрыты от чтения с клиента.',
        'Загрузка фотографий идёт по одноразовым подписанным ссылкам; произвольная запись в хранилище закрыта.',
        'Доступ к данным со стороны команды — только у владельца сервиса.',
        'Ни одна система не даёт абсолютной защиты, но об инцидентах, затрагивающих твои данные, мы сообщим в приложении или через бота.',
      ],
    },
    {
      h: '11. Фотографии и содержание образов',
      p: [
        'Фотографии, которые ты публикуешь, доступны по прямой ссылке всем, у кого эта ссылка есть, — так устроена раздача изображений. Не публикуй то, что не готов показать посторонним.',
        'Перед публикацией фотография проверяется автоматически на откровенное содержание. Проверка выполняется на твоём устройстве, изображение при этом никуда дополнительно не отправляется.',
      ],
    },
    {
      h: '12. Изменения политики',
      p: [
        'Если документ существенно поменяется, мы покажем его при следующем входе и попросим согласиться заново. Дата последнего изменения указана в начале документа.',
      ],
    },
  ],
}

const TERMS_RU = {
  title: 'Условия использования',
  updated: '26 сентября 2026',
  intro:
    'Короткие правила, по которым работает Driply. Пользуясь сервисом, ты с ними соглашаешься.',
  sections: [
    {
      h: '1. Что такое Driply',
      p: [
        'Driply — мини-приложение в Telegram, где люди публикуют свои образы и оценивают чужие внутренней валютой сервиса — дрипами.',
        'Сервис работает «как есть». Мы развиваем его и можем менять функции, правила начислений и внешний вид.',
      ],
    },
    {
      h: '2. Кто может пользоваться',
      list: [
        'Тебе есть 13 лет, а если меньше 18 — ты пользуешься сервисом с согласия родителей.',
        'У тебя есть аккаунт Telegram, и ты соблюдаешь правила Telegram.',
        'Один человек — один аккаунт. Аккаунты, созданные для накрутки, мы удаляем.',
      ],
    },
    {
      h: '3. Твой контент',
      list: [
        'Права на фотографии остаются твоими. Мы их себе не забираем.',
        'Публикуя образ, ты разрешаешь нам показывать его в приложении, в рейтинге и в карточке для историй — бесплатно и до тех пор, пока ты его не удалишь.',
        'Ты отвечаешь за то, что публикуешь: за права на фотографию и за согласие людей, попавших в кадр.',
        'Удалённый образ пропадает из приложения сразу; копии из кеша и историй, которыми уже поделились, могут жить дольше — это вне нашего контроля.',
      ],
    },
    {
      h: '4. Что нельзя публиковать',
      list: [
        'Откровенные материалы, обнажённость сексуального характера.',
        'Чужие фотографии, выданные за свои, и снимки людей без их согласия.',
        'Оскорбления, травлю, угрозы, разжигание ненависти, комментарии о теле и внешности человека, а не об одежде.',
        'Рекламу, спам, ссылки на посторонние сервисы, попытки продать что-либо.',
        'Всё, что нарушает закон или правила Telegram.',
        'Driply — про стиль. Всё, что не про стиль, здесь лишнее.',
      ],
    },
    {
      h: '5. Дрипы',
      list: [
        'Дрипы — внутренние баллы сервиса. Это не деньги, не электронное средство платежа и не криптовалюта.',
        'Дрипы нельзя купить, продать, обменять или вывести. Их можно только заработать в приложении.',
        'Дрипы не имеют денежной ценности, и мы не обязаны возмещать их деньгами ни при каких обстоятельствах.',
        'Мы можем менять размеры начислений и стоимость действий. Дрипы, полученные обманом или накруткой, аннулируются вместе с очками стиля.',
        'При удалении аккаунта дрипы сгорают.',
      ],
    },
    {
      h: '6. Оценки и рейтинг',
      list: [
        'Оценивая образ, ты отдаёшь свои дрипы автору — отменить это нельзя.',
        'Оценить один и тот же образ можно один раз.',
        'Нельзя оценивать свои образы и договариваться о взаимных оценках ради рейтинга.',
        'Рейтинг недели обнуляется по понедельникам, месяц — в начале месяца. Мы можем пересчитать рейтинг, если обнаружим накрутку.',
      ],
    },
    {
      h: '7. Жалобы и модерация',
      list: [
        'На любой образ и профиль можно пожаловаться прямо в приложении. Жалобы анонимны.',
        'Жалобы разбирает человек. Мы можем скрыть образ, скрыть все образы автора или заблокировать доступ к сервису.',
        'За повторные нарушения доступ ограничивается без предупреждения.',
        'Если считаешь решение ошибочным — напиши в поддержку, мы пересмотрим.',
      ],
    },
    {
      h: '8. Статусы и значки',
      p: [
        'Некоторые статусы — например first drip для первых 50 авторов — выдаются ограниченному числу людей и не передаются другим аккаунтам. Мы можем снять статус, если он получен с нарушением правил.',
      ],
    },
    {
      h: '9. Приглашения',
      list: [
        'За приглашённого друга начисляются дрипы после того, как он выложит первый образ.',
        'Нельзя приглашать самого себя, создавать пустые аккаунты и рассылать ссылку спамом. Такие начисления аннулируются.',
      ],
    },
    {
      h: '10. Прекращение доступа',
      p: [
        'Ты можешь уйти в любой момент: напиши в поддержку, и мы удалим аккаунт.',
        'Мы можем ограничить или прекратить доступ, если нарушаются эти правила или закон. Если нарушение не грубое, мы сначала предупредим.',
      ],
    },
    {
      h: '11. Ответственность',
      p: [
        'Сервис предоставляется без гарантий бесперебойной работы. Мы стараемся, но перерывы, ошибки и потеря данных возможны.',
        'Мы не отвечаем за содержание, которое публикуют пользователи, и за договорённости между ними.',
      ],
    },
    {
      h: '12. Изменения правил',
      p: [
        'Правила могут меняться. О существенных изменениях мы сообщим в приложении и попросим согласиться заново. Дата последнего изменения указана в начале документа.',
      ],
    },
  ],
}

const PRIVACY_EN = {
  title: 'Privacy Policy',
  updated: '26 September 2026',
  intro:
    'This document explains what data Driply collects, why, how long it is kept, who it is shared with and what you can do about it. It is written from how the app actually works — the list of data was checked against the database.',
  sections: [
    { h: '1. Who processes your data', p: [
      'The operator is the owner of Driply (a Telegram mini app and the @Driplycheckbot bot).',
      'For data questions, account deletion and complaints write to “Settings → Support” in the app or to @Driplycheckbot. We reply with a message from the bot.',
    ] },
    { h: '2. What we receive', list: [
      'From Telegram at launch: your Telegram id, name, @username (if you have one), avatar link, interface language. We do not receive your phone number, contacts or messages.',
      'What you enter yourself: your Driply nickname, bio, gender (optional), outfit photos, captions, item names and brands, prices, chosen styles.',
      'What comes from usage: your votes (how many drips and to whom), drip balance, style score, follows and followers, block list, reports, support messages.',
      'Technical events: app opens, starting a post, publishing, application errors. They show where the app breaks or gets in the way.',
      'We do not collect location, do not read the clipboard, do not use advertising identifiers and do not buy data about you from third parties.',
    ] },
    { h: '3. Why we process it', list: [
      'To run the service: the feed, profiles, leaderboard, earning and spending drips.',
      'To keep order: handling reports, hiding violating content, restricting access for offenders.',
      'To answer your support requests.',
      'To improve the app: to see where people abandon posting and what errors occur.',
      'To send notifications you have not switched off in settings.',
      'We do not use your data for advertising and do not share it with advertisers.',
    ] },
    { h: '4. Legal basis', p: [
      'We process data based on your consent given at registration, and to the extent necessary to provide the service you are using.',
      'You can withdraw consent at any time by deleting your account (see section 8). Some data is kept in anonymised form, as described below.',
    ] },
    { h: '5. What other people see', list: [
      'Public in the app: your nickname, avatar, bio, gender (if set), status and badges, style score, leaderboard position, published looks with captions, items and prices, follower and following counts.',
      'Your @username is visible only if you have not enabled “Hide @username” in profile settings.',
      'Nobody but us sees: your Telegram id, drip balance, who exactly you voted for, who you blocked, your reports and support conversations.',
      'Reports are anonymous: the author never learns who reported them.',
    ] },
    { h: '6. Who we share data with', list: [
      'Telegram — the platform the app runs in. Notifications and support replies are delivered through Telegram under Telegram’s rules.',
      'Supabase — database and file hosting (servers in the European Union). Accounts, looks and service data are stored there.',
      'Vercel — hosting for the app itself.',
      'Government authorities — only on a valid lawful request.',
      'We do not sell data, do not pass it to ad networks and use no third-party analytics trackers: statistics are computed in our own database.',
    ] },
    { h: '7. How long we keep it', list: [
      'Account and looks — while the account exists.',
      'Hidden and deleted looks — removed from the feed immediately; photo files are deleted within 30 days.',
      'Support conversations — up to 1 year, so a dispute can be revisited.',
      'Reports and decisions — up to 1 year, to see repeat violations.',
      'Technical events — up to 12 months, after which only anonymised statistics remain.',
    ] },
    { h: '8. Your rights', list: [
      'View and change your data — in the app, “Settings → Edit profile”.',
      'Hide or delete any of your looks — in the looks archive.',
      'Delete the whole account with looks, votes and follows — write to support; we delete within 30 days and confirm by message.',
      'Get a copy of your data, correct it or withdraw consent — through support.',
      'Complain about how we handle data — to us first, and to your local supervisory authority if our answer does not satisfy you.',
    ] },
    { h: '9. Age', p: [
      'Driply is not intended for children under 13 and we do not knowingly collect their data. If you are under 13, do not use the service.',
      'If you are between 13 and 18, use Driply with the consent of a parent or guardian.',
      'If we learn that an account belongs to a child under 13, we delete the account and related data. You can report such an account through support.',
    ] },
    { h: '10. How we protect data', list: [
      'The app never talks to the database directly: every change goes through a server that verifies the Telegram signature, so nobody can act as you without your session.',
      'Private profile fields and service tables cannot be read from the client.',
      'Photos are uploaded via one-time signed links; arbitrary writes to storage are closed.',
      'Access on our side is limited to the owner of the service.',
      'No system is perfectly secure, but we will tell you in the app or via the bot about incidents affecting your data.',
    ] },
    { h: '11. Photos and look content', p: [
      'Photos you publish are reachable by direct link to anyone who has that link — that is how image delivery works. Do not publish what you are not ready to show to strangers.',
      'Before publishing, a photo is checked automatically for explicit content. The check runs on your device; the image is not sent anywhere extra for it.',
    ] },
    { h: '12. Changes', p: [
      'If the document changes materially, we will show it at your next visit and ask you to accept again. The date of the last change is at the top.',
    ] },
  ],
}

const TERMS_EN = {
  title: 'Terms of Use',
  updated: '26 September 2026',
  intro: 'The short rules Driply runs on. By using the service you agree to them.',
  sections: [
    { h: '1. What Driply is', p: [
      'Driply is a Telegram mini app where people publish their outfits and rate others with the in-app currency called drips.',
      'The service is provided as is. We keep developing it and may change features, reward amounts and appearance.',
    ] },
    { h: '2. Who may use it', list: [
      'You are at least 13, and if under 18 you use the service with a parent’s consent.',
      'You have a Telegram account and follow Telegram’s rules.',
      'One person — one account. Accounts created to inflate ratings are removed.',
    ] },
    { h: '3. Your content', list: [
      'You keep the rights to your photos. We do not take them.',
      'By publishing a look you allow us to show it in the app, in the leaderboard and in the story card — free of charge and until you delete it.',
      'You are responsible for what you publish: for the rights to the photo and for the consent of people in the frame.',
      'A deleted look disappears from the app immediately; cached copies and stories already shared may live longer — that is outside our control.',
    ] },
    { h: '4. What you may not publish', list: [
      'Explicit material or sexual nudity.',
      'Other people’s photos passed off as yours, and photos of people without their consent.',
      'Insults, harassment, threats, hate speech, comments about someone’s body rather than their clothes.',
      'Advertising, spam, links to outside services, attempts to sell anything.',
      'Anything breaking the law or Telegram’s rules.',
      'Driply is about style. Everything else is out of place here.',
    ] },
    { h: '5. Drips', list: [
      'Drips are in-app points. They are not money, not a payment instrument and not a cryptocurrency.',
      'Drips cannot be bought, sold, exchanged or withdrawn. They can only be earned in the app.',
      'Drips have no monetary value and we are not obliged to compensate them with money under any circumstances.',
      'We may change reward amounts and prices of actions. Drips obtained by fraud are cancelled together with the style score.',
      'When an account is deleted, its drips are gone.',
    ] },
    { h: '6. Votes and leaderboard', list: [
      'When you rate a look you give your drips to the author — this cannot be undone.',
      'You can rate the same look once.',
      'You may not rate your own looks or arrange mutual rating to climb the leaderboard.',
      'The weekly leaderboard resets on Mondays, the monthly one at the start of the month. We may recalculate it if we find manipulation.',
    ] },
    { h: '7. Reports and moderation', list: [
      'Any look or profile can be reported in the app. Reports are anonymous.',
      'A human reviews reports. We may hide a look, hide all of an author’s looks, or restrict access to the service.',
      'Repeat violations lead to restriction without warning.',
      'If you think a decision is wrong, write to support and we will review it.',
    ] },
    { h: '8. Statuses and badges', p: [
      'Some statuses — such as first drip for the first 50 authors — are limited in number and are not transferable between accounts. We may remove a status obtained in breach of these rules.',
    ] },
    { h: '9. Invites', list: [
      'You earn drips for an invited friend once they publish their first look.',
      'You may not invite yourself, create empty accounts or spam the link. Such rewards are cancelled.',
    ] },
    { h: '10. Ending access', p: [
      'You can leave at any time: write to support and we will delete the account.',
      'We may restrict or end access if these rules or the law are broken. For minor breaches we warn first.',
    ] },
    { h: '11. Liability', p: [
      'The service comes with no guarantee of uninterrupted operation. We try, but outages, bugs and data loss are possible.',
      'We are not responsible for content published by users or for arrangements between them.',
    ] },
    { h: '12. Changes', p: [
      'The rules may change. We will announce material changes in the app and ask you to accept them again. The date of the last change is at the top.',
    ] },
  ],
}

export const LEGAL = {
  ru: { privacy: PRIVACY_RU, terms: TERMS_RU },
  en: { privacy: PRIVACY_EN, terms: TERMS_EN },
}

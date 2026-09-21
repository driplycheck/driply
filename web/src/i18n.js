const DICT = {
  ru: {
    // общее
    back: '‹ Назад', loading: 'Загрузка…', cancel: 'Отмена',
    save: 'Сохранить', delete: 'Удалить', retry_failed: 'Не получилось, попробуй ещё раз',
    save_failed: 'Не получилось сохранить, попробуй ещё раз',

    settings: 'Настройки', edit_profile: 'Редактировать профиль',
    hide_username: 'Скрывать @username',
    hide_username_hint: 'Другие не увидят твой ник в Telegram',
    dm_allow: 'Разрешить сообщения',
    dm_allow_hint: 'Другие смогут написать тебе в Telegram',
    write_msg: 'Написать',
    language: 'Язык',
    interface_side: 'Расположение кнопок',
    appearance: 'Оформление',
    theme_auto: 'Как в Telegram', theme_dark: 'Тёмная', theme_light: 'Светлая', theme_neon: 'Цветная',
    theme_auto_hint: '«Как в Telegram» — тема переключается вместе с темой Telegram.',
    theme_preview_note: 'Предпросмотр: темы видишь только ты. Остальные экраны перекрашиваются постепенно.',
    gender: 'Пол', gender_male: 'Парень', gender_female: 'Девушка',
    notifications: 'Уведомления',
    notify_follows: 'Подписки',
    notify_all: 'Все уведомления',
    notify_all_hint: 'Главный переключатель',
    notify_votes: 'Оценки образов',
    notify_referral: 'Рефералы',
    notify_hint: 'Сообщение в бот, когда на тебя подписались',
    sec_general: 'Основное', sec_privacy: 'Приватность',
    sec_notify: 'Уведомления', sec_about: 'О приложении',
    support: 'Поддержка', about_app: 'О Driply',
    about_text: 'Driply — лента образов, где их оценивают дрипами.',
    version: 'Версия',
    invite_friend: 'Пригласить друга (+500)',
    invite_text: 'Залетай в Driply — оценим твой стиль 🔥',
    block_user: 'Заблокировать', unblock_user: 'Разблокировать',
    blocked_list: 'Чёрный список', no_blocks: 'Никто не заблокирован',
    block_confirm: 'Заблокировать пользователя?',
    block_hint: 'Вы перестанете видеть друг друга. Подписки сохранятся.',
    referral: 'Реферальная программа',
    ref_invited: 'приглашено', ref_earned: 'заработано',
    ref_your_link: 'Твоя ссылка', copy: 'Копировать',
    ref_note: 'Друг получит 200 дрипов, ты — 500, когда он выложит первый образ.',
    side_right: 'Справа', side_left: 'Слева',
    tab_all: 'Для тебя', tab_following: 'Подписки', chip_all: 'Все',
    tab_home_aria: 'Лента', balance_aria: 'Баланс: {n} дрипов', tab_top_aria: 'Рейтинг',
    drip_it: 'Дрипнуть', dripped: 'Дрипнуто',
    ago_now: 'только что', ago_min: '{n} мин назад', ago_h: '{n} ч назад', ago_d: '{n} д назад',
    follow: 'Подписаться', unfollow: 'Отписаться',
    followers: 'подписчиков', following_cnt: 'подписок',
    share_story: 'Поделиться в Stories',
    share_unsupported: 'Обнови Telegram, чтобы делиться в Stories',
    share_failed: 'Не получилось, попробуй ещё раз',

    // лента
    feed_error: 'Лента не загрузилась.',
    feed_loading: 'Загружаем ленту…',
    feed_empty_following: 'Пока пусто. Подпишись на кого-нибудь — их образы появятся здесь.',
    feed_empty_all: 'Пока пусто. Первый образ — за тобой.',
    search_aria: 'Поиск', my_profile_aria: 'Мой профиль',

    // онбординг
    onb_title: 'Создай профиль',
    onb_sub: 'Так тебя увидят в Driply',
    avatar_hint: 'Нажми, чтобы сменить фото',
    nick_placeholder: 'Ник',
    nick_required: 'Придумай ник',
    nick_empty: 'Ник не может быть пустым',
    skip: 'Пропустить', continue: 'Продолжить',
    profile: 'Профиль', bio_placeholder: 'О себе (био)',

    // публикация
    composer_new: 'Новый образ',
    composer_first: 'Твой первый образ',
    post_btn: 'Выложить',
    add_photo: '+ Добавить фото',
    photo_required: 'Добавь фото',
    post_failed: 'Не удалось выложить, попробуй ещё раз',
    first_post_hint: 'Достаточно фото. Детали можно добавить сейчас или позже.',
    details_add: 'Добавить детали', details_hide: 'Скрыть детали',
    details_count: 'Детали · {n}',
    caption_placeholder: 'Подпись (необязательно)',
    style_label: 'Стиль (необязательно)',
    brand_placeholder: 'Бренд', name_placeholder: 'Название',
    cat_top: '👕 Верх', cat_bottoms: '👖 Низ', cat_shoes: '👟 Обувь',
    cat_accessory: '🧢 Аксессуар', cat_other: '✨ Другое',
    cat_dress: '👗 Платье', cat_skirt: '👚 Юбка', cat_bag: '👜 Сумка',
    reward_toast: '+{n} за образ',

    // карточка образа
    vote_aria: 'Оценить образ',
    report: 'Пожаловаться',
    post_look: 'Выложить образ',
    items_aria: 'Вещи на образе',
    credits_left: 'Осталось дрипов: {n}',
    already_voted: 'Ты уже оценил этот образ',
    already_voted_short: 'Уже оценил',
    not_enough_credits: 'Не хватает дрипов',
    cannot_vote_own: 'Нельзя голосовать за свой образ',
    auth_failed: 'Не удалось подтвердить вход',

    // профиль
    my_votes: 'Мои оценки', archive_aria: 'Архив',
    profile_not_found: 'Профиль не найден',
    badge_founder: '★ Основатель', badge_first_drip: 'первый дрип',
    stat_style_score: 'очки стиля', stat_rank: 'в рейтинге', stat_looks: 'образов',
    stat_looks_short: 'образы', stat_followers: 'подписчики', stat_following: 'подписки', stat_drips: 'дрипов',
    rank_label: 'Ранг', rank_place: '#{n} в рейтинге', rank_next: 'до {tier} · {pct}%', rank_max: 'максимальный уровень',
    tier_base: 'Новичок', tier_bronze: 'Бронза', tier_silver: 'Серебро', tier_gold: 'Золото',
    tier_to_bronze: 'Бронзы', tier_to_silver: 'Серебра', tier_to_gold: 'Золота',
    profile_edit: 'Редактировать', profile_share: 'Поделиться', profile_looks_tab: 'Образы',
    badge_founder_short: 'Founder', you: 'ты', leaderboard: 'Рейтинг', leaderboard_sub: 'Очки стиля — сколько дрипов собрали образы',
    no_looks: 'Пока нет образов',

    // история публикаций
    archive_title: 'История публикаций',
    no_posts: 'Пока нет публикаций',
    hidden_badge: 'скрыт', restore: 'Вернуть', hide: 'Скрыть',
    delete_forever: 'Удалить навсегда?',
    delete_hint: 'Примечание: очки, набранные за этот образ, будут списаны с твоего рейтинга. Награда за публикацию останется. Действие необратимо.',

    // открытый пост
    close_aria: 'Закрыть', hide_look_aria: 'Скрыть образ',
    post_not_found: 'Пост не найден',
    hide_confirm: 'Скрыть образ из ленты?',
    hide_confirm_hint: 'Очки сохранятся. Вернуть можно из истории публикаций.',

    // поиск
    search_placeholder: 'Люди и вещи',
    sec_rating: 'Рейтинг', top_style: 'Топ по стилю', top_style_sub: 'Кто на каком месте',
    sec_styles: 'Стили', sec_people: 'Люди', sec_items: 'Вещи',
    search_hint: 'Введи ник человека или вещь',
    searching: 'Ищем…', nothing_found: 'Ничего не найдено',
    no_looks_in_style: 'Пока нет образов в этой категории',
    rating_empty: 'Рейтинг пока пуст',

    // мои оценки
    votes_empty: 'Ты ещё не голосовал ни за один образ.',
    look_score: 'Рейтинг образа: {n}',

    // жалобы
    report_look: 'Пожаловаться на образ',
    report_profile: 'Пожаловаться на профиль',
    report_reason: 'Выбери причину — мы проверим.',
    report_sent: 'Жалоба отправлена',
    report_thanks: 'Спасибо, мы проверим.',
    r_nsfw: 'Откровенный контент', r_harassment: 'Оскорбление / травля',
    r_spam: 'Спам или реклама', r_not_outfit: 'Не образ / не по теме', r_other: 'Другое',

    // рефералы и подписки
    ref_invited_list: 'Приглашённые', ref_waiting: '⏳ ждёт поста',
    copy_failed: 'Не удалось скопировать',
    no_followers: 'Пока нет подписчиков',
    no_following: 'Пока ни на кого не подписан',

    // о приложении
    about_intro: 'Driply — пространство, где зумеры делятся своими образами и получают честную оценку от таких же, как они, а не от анонимного алгоритма.',
    rules_title: 'Правила сообщества',
    rule_style: 'Мы оцениваем стиль и выбор вещей — не внешность и не человека. Комментарии о теле или лице здесь неуместны.',
    rule_respect: 'Уважай тех, кого оцениваешь. Низкий счёт — это мнение о луке, не приговор человеку.',
    rule_content: 'Не публикуй рекламу, чужие фото без согласия и контент не по теме приложения.',
    rule_violation: 'За нарушения — предупреждение или блокировка.',
    privacy_title: 'Данные и приватность',
    privacy_text: 'Мы храним твой Telegram-профиль (имя, юзернейм, аватар), опубликованные образы и историю голосований — только чтобы приложение работало. Ничего из этого не передаётся третьим лицам и не используется вне Driply.',

    // карточка для Stories
    story_share_text: 'Мой стиль в Driply 🔥',
    story_rank: '#{n} в рейтинге',
    story_looks: '{n} образов',
  },

  en: {
    // common
    back: '‹ Back', loading: 'Loading…', cancel: 'Cancel',
    save: 'Save', delete: 'Delete', retry_failed: 'Something went wrong, try again',
    save_failed: 'Couldn’t save, try again',

    settings: 'Settings', edit_profile: 'Edit profile',
    hide_username: 'Hide @username',
    hide_username_hint: 'Others won’t see your Telegram handle',
    dm_allow: 'Allow messages',
    dm_allow_hint: 'Others can message you on Telegram',
    write_msg: 'Message',
    language: 'Language',
    interface_side: 'Buttons side',
    appearance: 'Appearance',
    theme_auto: 'Like Telegram', theme_dark: 'Dark', theme_light: 'Light', theme_neon: 'Neon',
    theme_auto_hint: '“Like Telegram” follows your Telegram theme automatically.',
    theme_preview_note: 'Preview: only you can see themes. Other screens are being restyled step by step.',
    gender: 'Gender', gender_male: 'Male', gender_female: 'Female',
    notifications: 'Notifications',
    notify_follows: 'Follows',
    notify_all: 'All notifications',
    notify_all_hint: 'Master switch',
    notify_votes: 'Outfit ratings',
    notify_referral: 'Referrals',
    notify_hint: 'Bot message when someone follows you',
    sec_general: 'General', sec_privacy: 'Privacy',
    sec_notify: 'Notifications', sec_about: 'About',
    support: 'Support', about_app: 'About Driply',
    about_text: 'Driply is a feed of outfits rated with drips.',
    version: 'Version',
    invite_friend: 'Invite a friend (+500)',
    invite_text: 'Join Driply — let’s rate your style 🔥',
    block_user: 'Block', unblock_user: 'Unblock',
    blocked_list: 'Blocked users', no_blocks: 'No one blocked',
    block_confirm: 'Block this user?',
    block_hint: 'You won’t see each other. Follows stay.',
    referral: 'Referral program',
    ref_invited: 'invited', ref_earned: 'earned',
    ref_your_link: 'Your link', copy: 'Copy',
    ref_note: 'Your friend gets 200 drips, you get 500 once they post their first look.',
    side_right: 'Right', side_left: 'Left',
    tab_all: 'For you', tab_following: 'Following', chip_all: 'All',
    tab_home_aria: 'Feed', balance_aria: 'Balance: {n} drips', tab_top_aria: 'Leaderboard',
    drip_it: 'Drip', dripped: 'Dripped',
    ago_now: 'just now', ago_min: '{n}m ago', ago_h: '{n}h ago', ago_d: '{n}d ago',
    follow: 'Follow', unfollow: 'Unfollow',
    followers: 'followers', following_cnt: 'following',
    share_story: 'Share to Stories',
    share_unsupported: 'Update Telegram to share to Stories',
    share_failed: 'Failed, try again',

    // feed
    feed_error: 'Couldn’t load the feed.',
    feed_loading: 'Loading the feed…',
    feed_empty_following: 'Nothing here yet. Follow someone and their looks will show up.',
    feed_empty_all: 'Nothing here yet. The first look is on you.',
    search_aria: 'Search', my_profile_aria: 'My profile',

    // onboarding
    onb_title: 'Create your profile',
    onb_sub: 'This is how you show up in Driply',
    avatar_hint: 'Tap to change the photo',
    nick_placeholder: 'Nickname',
    nick_required: 'Pick a nickname',
    nick_empty: 'Nickname can’t be empty',
    skip: 'Skip', continue: 'Continue',
    profile: 'Profile', bio_placeholder: 'About you (bio)',

    // composer
    composer_new: 'New look',
    composer_first: 'Your first look',
    post_btn: 'Post',
    add_photo: '+ Add photo',
    photo_required: 'Add a photo',
    post_failed: 'Couldn’t post, try again',
    first_post_hint: 'A photo is enough. Details can be added now or later.',
    details_add: 'Add details', details_hide: 'Hide details',
    details_count: 'Details · {n}',
    caption_placeholder: 'Caption (optional)',
    style_label: 'Style (optional)',
    brand_placeholder: 'Brand', name_placeholder: 'Name',
    cat_top: '👕 Top', cat_bottoms: '👖 Bottoms', cat_shoes: '👟 Shoes',
    cat_accessory: '🧢 Accessory', cat_other: '✨ Other',
    cat_dress: '👗 Dress', cat_skirt: '👚 Skirt', cat_bag: '👜 Bag',
    reward_toast: '+{n} for the look',

    // post card
    vote_aria: 'Rate this look',
    report: 'Report',
    post_look: 'Post a look',
    items_aria: 'Items in this look',
    credits_left: '{n} drips left',
    already_voted: 'You already rated this look',
    already_voted_short: 'Already rated',
    not_enough_credits: 'Not enough drips',
    cannot_vote_own: 'You can’t rate your own look',
    auth_failed: 'Couldn’t verify your login',

    // profile
    my_votes: 'My votes', archive_aria: 'Archive',
    profile_not_found: 'Profile not found',
    badge_founder: '★ Founder', badge_first_drip: 'first drip',
    stat_style_score: 'style points', stat_rank: 'in ranking', stat_looks: 'looks',
    stat_looks_short: 'looks', stat_followers: 'followers', stat_following: 'following', stat_drips: 'drips',
    rank_label: 'Rank', rank_place: '#{n} in ranking', rank_next: 'to {tier} · {pct}%', rank_max: 'top tier',
    tier_base: 'Rookie', tier_bronze: 'Bronze', tier_silver: 'Silver', tier_gold: 'Gold',
    tier_to_bronze: 'Bronze', tier_to_silver: 'Silver', tier_to_gold: 'Gold',
    profile_edit: 'Edit', profile_share: 'Share', profile_looks_tab: 'Looks',
    badge_founder_short: 'Founder', you: 'you', leaderboard: 'Leaderboard', leaderboard_sub: 'Style points — drips collected by looks',
    no_looks: 'No looks yet',

    // post history
    archive_title: 'Post history',
    no_posts: 'No posts yet',
    hidden_badge: 'hidden', restore: 'Restore', hide: 'Hide',
    delete_forever: 'Delete forever?',
    delete_hint: 'Note: the points this look earned will be taken off your score. The posting reward stays. This can’t be undone.',

    // opened post
    close_aria: 'Close', hide_look_aria: 'Hide look',
    post_not_found: 'Post not found',
    hide_confirm: 'Hide this look from the feed?',
    hide_confirm_hint: 'Points stay. You can bring it back from post history.',

    // search
    search_placeholder: 'People and items',
    sec_rating: 'Ranking', top_style: 'Style top', top_style_sub: 'Who ranks where',
    sec_styles: 'Styles', sec_people: 'People', sec_items: 'Items',
    search_hint: 'Type a nickname or an item',
    searching: 'Searching…', nothing_found: 'Nothing found',
    no_looks_in_style: 'No looks in this style yet',
    rating_empty: 'Ranking is empty so far',

    // my votes
    votes_empty: 'You haven’t rated any looks yet.',
    look_score: 'Look score: {n}',

    // reports
    report_look: 'Report this look',
    report_profile: 'Report this profile',
    report_reason: 'Pick a reason and we’ll review it.',
    report_sent: 'Report sent',
    report_thanks: 'Thanks, we’ll take a look.',
    r_nsfw: 'Explicit content', r_harassment: 'Harassment or bullying',
    r_spam: 'Spam or ads', r_not_outfit: 'Not an outfit / off topic', r_other: 'Other',

    // referrals and follows
    ref_invited_list: 'Invited', ref_waiting: '⏳ waiting for a post',
    copy_failed: 'Couldn’t copy',
    no_followers: 'No followers yet',
    no_following: 'Not following anyone yet',

    // about
    about_intro: 'Driply is a space where zoomers share their looks and get an honest opinion from people like them, not from an anonymous algorithm.',
    rules_title: 'Community rules',
    rule_style: 'We rate style and the choice of clothes, not looks and not the person. Comments about someone’s body or face don’t belong here.',
    rule_respect: 'Respect the people you rate. A low score is an opinion about the outfit, not a verdict on the person.',
    rule_content: 'No ads, no photos of other people without their consent, nothing off topic.',
    rule_violation: 'Breaking the rules means a warning or a ban.',
    privacy_title: 'Data and privacy',
    privacy_text: 'We store your Telegram profile (name, username, avatar), the looks you post and your voting history, only so the app works. None of it is shared with third parties or used outside Driply.',

    // story card
    story_share_text: 'My style on Driply 🔥',
    story_rank: '#{n} in ranking',
    story_looks: '{n} looks',
  },
}

export const LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

// пока человек не выбрал язык сам, идём за языком его Telegram
function telegramLang() {
  try {
    const code = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code || ''
    return code.toLowerCase().startsWith('ru') ? 'ru' : 'en'
  } catch { return 'ru' }
}

export function loadLang() {
  try { return localStorage.getItem('driply_lang') || telegramLang() } catch { return 'ru' }
}
export function saveLang(l) {
  try { localStorage.setItem('driply_lang', l) } catch {}
}

// язык берём до первого рендера: иначе экран успевает отрисоваться по-русски
let active = loadLang()
export function setActiveLang(l) { if (DICT[l]) active = l }
export function activeLang() { return active }

// t('credits_left', { n: 5 }) → «Осталось дрипов: 5»
export function t(key, params) {
  const raw = (DICT[active] && DICT[active][key]) || DICT.ru[key] || key
  if (!params) return raw
  return raw.replace(/\{(\w+)\}/g, (match, name) => (params[name] ?? match))
}

// названия стилей лежат в базе двумя колонками
export function styleName(style) {
  if (!style) return ''
  const preferred = active === 'en' ? style.name_en : style.name_ru
  return preferred || style.name_ru || style.name_en || ''
}

// «2 ч назад»; старше недели — дата
export function timeAgo(iso) {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms)) return ''
  const min = Math.floor(ms / 60000)
  if (min < 1) return t('ago_now')
  if (min < 60) return t('ago_min', { n: min })
  const h = Math.floor(min / 60)
  if (h < 24) return t('ago_h', { n: h })
  const d = Math.floor(h / 24)
  if (d < 7) return t('ago_d', { n: d })
  return new Date(iso).toLocaleDateString(active === 'en' ? 'en-US' : 'ru-RU', { day: 'numeric', month: 'short' })
}

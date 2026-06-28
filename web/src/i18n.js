const DICT = {
  ru: {
    back: '‹ Назад', settings: 'Настройки', edit_profile: 'Редактировать профиль',
    hide_username: 'Скрывать @username',
    hide_username_hint: 'Другие не увидят твой ник в Telegram',
    language: 'Язык',
    interface_side: 'Расположение кнопок',
    gender: 'Пол', gender_male: 'Парень', gender_female: 'Девушка',
    notifications: 'Уведомления',
    notify_follows: 'Уведомлять о подписках',
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
    ref_note: 'Друг получит 200 кредитов, ты — 500, когда он выложит первый образ.',
    side_right: 'Справа', side_left: 'Слева',
    tab_all: 'Все', tab_following: 'Подписки',
    follow: 'Подписаться', unfollow: 'Отписаться',
    followers: 'подписчиков', following_cnt: 'подписок',
    share_story: 'Поделиться в Stories',
    share_unsupported: 'Обнови Telegram, чтобы делиться в Stories',
    share_failed: 'Не получилось, попробуй ещё раз',
  },
  en: {
    back: '‹ Back', settings: 'Settings', edit_profile: 'Edit profile',
    hide_username: 'Hide @username',
    hide_username_hint: 'Others won’t see your Telegram handle',
    language: 'Language',
    interface_side: 'Buttons side',
    gender: 'Gender', gender_male: 'Male', gender_female: 'Female',
    notifications: 'Notifications',
    notify_follows: 'Notify on new followers',
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
    ref_note: 'Your friend gets 200 credits, you get 500 once they post their first look.',
    side_right: 'Right', side_left: 'Left',
    tab_all: 'All', tab_following: 'Following',
    follow: 'Follow', unfollow: 'Unfollow',
    followers: 'followers', following_cnt: 'following',
    share_story: 'Share to Stories',
    share_unsupported: 'Update Telegram to share to Stories',
    share_failed: 'Failed, try again',
  },
}

export const LANGS = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
]

let active = 'ru'
export function setActiveLang(l) { if (DICT[l]) active = l }
export function t(key) {
  return (DICT[active] && DICT[active][key]) || DICT.ru[key] || key
}
export function loadLang() {
  try { return localStorage.getItem('driply_lang') || 'ru' } catch { return 'ru' }
}
export function saveLang(l) {
  try { localStorage.setItem('driply_lang', l) } catch {}
}

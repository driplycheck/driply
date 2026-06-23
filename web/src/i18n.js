const DICT = {
  ru: {
    back: '‹ Назад', settings: 'Настройки', edit_profile: 'Редактировать профиль',
    hide_username: 'Скрывать @username',
    hide_username_hint: 'Другие не увидят твой ник в Telegram',
    language: 'Язык',
    tab_all: 'Все', tab_following: 'Подписки',
    follow: 'Подписаться', unfollow: 'Отписаться',
    followers: 'подписчиков', following_cnt: 'подписок',
  },
  en: {
    back: '‹ Back', settings: 'Settings', edit_profile: 'Edit profile',
    hide_username: 'Hide @username',
    hide_username_hint: 'Others won’t see your Telegram handle',
    language: 'Language',
    tab_all: 'All', tab_following: 'Following',
    follow: 'Follow', unfollow: 'Unfollow',
    followers: 'followers', following_cnt: 'following',
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

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import './tokens.css'

export const THEMES = ['dark', 'light', 'neon']
export const CHOICES = ['auto', ...THEMES]

// Общий выключатель живёт в index.html: его же читает скрипт против вспышки темы.
// Пока экраны не перекрашены, темы видны только тем, у кого включён предпросмотр.
const THEMES_ENABLED = !!window.__DRIPLY_THEMES__
const CHOICE_KEY = 'driply_theme'
const PREVIEW_KEY = 'driply_theme_preview'
const CLOUD_KEY = 'theme'

const tg = window.Telegram?.WebApp

function readLocal(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function writeLocal(key, value) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {}
}

function cloudStorage() {
  if (!tg?.CloudStorage || !tg.isVersionAtLeast?.('6.9')) return null
  return tg.CloudStorage
}

function telegramScheme() {
  return tg?.colorScheme === 'light' ? 'light' : 'dark'
}

function validChoice(value) {
  return CHOICES.includes(value) ? value : 'auto'
}

function paintTelegram() {
  const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim()
  if (!tg || !bg) return
  // старые клиенты бросают исключение на неподдерживаемые методы
  try { tg.setHeaderColor?.(bg) } catch {}
  try { tg.setBackgroundColor?.(bg) } catch {}
  try { tg.setBottomBarColor?.(bg) } catch {}
}

const ThemeContext = createContext(null)

export function ThemeProvider({ children }) {
  const [choice, setChoice] = useState(() => validChoice(readLocal(CHOICE_KEY)))
  const [preview, setPreview] = useState(() => readLocal(PREVIEW_KEY) === '1')
  const [scheme, setScheme] = useState(telegramScheme)

  const enabled = THEMES_ENABLED || preview
  const theme = !enabled ? 'dark' : choice === 'auto' ? scheme : choice

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    paintTelegram()
  }, [theme])

  useEffect(() => {
    if (!tg?.onEvent) return
    const onChange = () => setScheme(telegramScheme())
    tg.onEvent('themeChanged', onChange)
    return () => tg.offEvent?.('themeChanged', onChange)
  }, [])

  // CloudStorage — источник истины между устройствами, localStorage — быстрый кэш для старта
  useEffect(() => {
    const cloud = cloudStorage()
    if (!cloud) return
    try {
      cloud.getItem(CLOUD_KEY, (err, value) => {
        if (err || !CHOICES.includes(value)) return
        writeLocal(CHOICE_KEY, value)
        setChoice(value)
      })
    } catch {}
  }, [])

  const setTheme = useCallback((next) => {
    const value = validChoice(next)
    setChoice(value)
    writeLocal(CHOICE_KEY, value)
    try { cloudStorage()?.setItem(CLOUD_KEY, value) } catch {}
  }, [])

  const allowPreview = useCallback((allowed) => {
    writeLocal(PREVIEW_KEY, allowed ? '1' : null)
    setPreview(allowed)
  }, [])

  const value = useMemo(() => ({
    theme, choice, isAuto: choice === 'auto', setTheme,
    enabled, isPreview: !THEMES_ENABLED && preview, allowPreview,
  }), [theme, choice, setTheme, enabled, preview, allowPreview])

  return (
    <ThemeContext.Provider value={value}>
      <div className="theme-glow theme-glow--1" aria-hidden="true" />
      <div className="theme-glow theme-glow--2" aria-hidden="true" />
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

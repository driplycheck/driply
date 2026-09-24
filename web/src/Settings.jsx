import AboutApp from './AboutApp.jsx'
import { callOrToast } from './api.js'
import { useState } from 'react'
import { ChevronLeft, ChevronRight, UserRound, Palette, ShieldCheck, Languages, Ban, Bell, UserPlus, Gift, Share2, LifeBuoy, Info } from 'lucide-react'
import { t, LANGS } from './i18n.js'
import { useTheme } from './theme/ThemeProvider.jsx'
import DripCoin from './components/ui/DripCoin.jsx'
import pkg from '../package.json'

// версия — в package.json: заметный деплой +0.1, конец редизайна — 2.0
const APP_VERSION = pkg.version.split('.').slice(0, 2).join('.')

// Иконка в плитке — единственное, что отличает строки друг от друга на беглый взгляд
function Row({ icon, label, hint, accent, onClick, children }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`srow ${onClick ? 'srow--tap' : ''}`} onClick={onClick}>
      <span className={`srow__icon ${accent ? 'srow__icon--accent' : ''}`}>{icon}</span>
      <span className="srow__text">
        <span className="srow__label">{label}</span>
        {hint && <span className="srow__hint">{hint}</span>}
      </span>
      {children ?? <ChevronRight className="srow__chev" size={18} strokeWidth={2} />}
    </Tag>
  )
}

const ICON = { size: 17, strokeWidth: 2 }

function Toggle({ active, onClick, disabled, label }) {
  return (
    <button className={`toggle ${active ? 'toggle--on' : ''}`} onClick={onClick} disabled={disabled} aria-label={label}>
      <span className="toggle__knob" />
    </button>
  )
}

export default function Settings({ me, lang, onLang, onClose, onEditProfile, onChanged, onOpenBlocked, onOpenReferral, onOpenAppearance, onOpenModeration, onOpenSupport }) {
  const { enabled: themesEnabled } = useTheme()
  const [prefs, setPrefs] = useState({
    all: me.notify_prefs?.all !== false,
    follows: me.notify_prefs?.follows !== false,
    votes: me.notify_prefs?.votes !== false,
    referral: me.notify_prefs?.referral !== false,
  })
  const [busy, setBusy] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  async function togglePref(key) {
    if (busy) return
    const next = !prefs[key]
    const updated = { ...prefs, [key]: next }
    setPrefs(updated); setBusy(true)
    const res = await callOrToast('set_notify_prefs', { prefs: { [key]: next } })
    setBusy(false)
    if (!res.ok) { setPrefs(prefs); return }
    onChanged({ notify_prefs: updated })
  }

  return (
    <div className="settings">
      <header className="settings__top">
        <button className="settings__back" onClick={onClose} aria-label={t('back')}>
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <span className="settings__title">{t('settings')}</span>
        <span className="settings__spacer" />
      </header>
      <div className="settings__body">

        <div className="ssection">{t('sec_general')}</div>
        <div className="sgroup">
          <Row icon={<UserRound {...ICON} />} label={t('edit_profile')} onClick={onEditProfile} />
          {themesEnabled && <Row icon={<Palette {...ICON} />} label={t('appearance')} onClick={onOpenAppearance} />}
          <Row icon={<Share2 {...ICON} />} label={t('referral')} onClick={onOpenReferral} />
          {me.is_founder && <Row icon={<ShieldCheck {...ICON} />} label={t('moderation')} accent onClick={onOpenModeration} />}
          <Row icon={<Languages {...ICON} />} label={t('language')}>
            <span className="sseg">
              {LANGS.map((l) => (
                <button
                  key={l.code}
                  className={`sseg__opt ${lang === l.code ? 'sseg__opt--on' : ''}`}
                  onClick={() => onLang(l.code)}
                >
                  {l.code.toUpperCase()}
                </button>
              ))}
            </span>
          </Row>
        </div>

        <div className="ssection">{t('sec_privacy')}</div>
        <div className="sgroup">
          <Row icon={<Ban {...ICON} />} label={t('blocked_list')} onClick={onOpenBlocked} />
        </div>

        <div className="ssection">{t('sec_notify')}</div>
        <div className="sgroup">
          <Row icon={<Bell {...ICON} />} label={t('notify_all')} hint={t('notify_all_hint')}>
            <Toggle active={prefs.all} onClick={() => togglePref('all')} disabled={busy} label="notify-all" />
          </Row>
          <div className={prefs.all ? '' : 'sgroup--off'}>
            <Row icon={<UserPlus {...ICON} />} label={t('notify_follows')}>
              <Toggle active={prefs.all && prefs.follows} onClick={() => togglePref('follows')} disabled={busy || !prefs.all} label="notify-follows" />
            </Row>
            <Row icon={<DripCoin size={17} />} label={t('notify_votes')}>
              <Toggle active={prefs.all && prefs.votes} onClick={() => togglePref('votes')} disabled={busy || !prefs.all} label="notify-votes" />
            </Row>
            <Row icon={<Gift {...ICON} />} label={t('notify_referral')}>
              <Toggle active={prefs.all && prefs.referral} onClick={() => togglePref('referral')} disabled={busy || !prefs.all} label="notify-referral" />
            </Row>
          </div>
        </div>

        <div className="ssection">{t('sec_about')}</div>
        <div className="sgroup">
          <Row icon={<LifeBuoy {...ICON} />} label={t('support')} onClick={onOpenSupport} />
          <Row icon={<Info {...ICON} />} label={t('about_app')} onClick={() => setAboutOpen(true)} />
        </div>

        <div className="sfoot">
          <DripCoin size={16} />
          <span className="sfoot__name">driply</span>
          <span className="sfoot__ver">{APP_VERSION}</span>
        </div>

      </div>
      {aboutOpen && <AboutApp onClose={() => setAboutOpen(false)} />}
    </div>
  )
}

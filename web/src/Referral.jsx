import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { tg } from './telegram.js'
import { t } from './i18n.js'
import { shareRankCard } from './storyCard.js'

export default function Referral({ me, onClose }) {
  const [stats, setStats] = useState(null)
  const [copied, setCopied] = useState(false)
  const [busyShare, setBusyShare] = useState(false)
  const [toast, setToast] = useState(null)

  function tgId() { return window.Telegram?.WebApp?.initDataUnsafe?.user?.id ?? 0 }

  useEffect(() => {
    supabase.rpc('ref_stats', { p_tid: tgId() }).then(({ data }) => setStats(data || {}))
  }, [])

  const code = stats?.ref_code || stats?.my_id
  const link = code ? `https://t.me/Driplycheckbot?startapp=ref_${code}` : ''

  function flash(m) { setToast(m); setTimeout(() => setToast(null), 2000) }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      flash('Не удалось скопировать')
    }
  }

  function shareLink() {
    if (tg?.openTelegramLink) {
      tg.openTelegramLink(
        `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(t('invite_text'))}`
      )
    }
  }

  async function shareStory() {
    if (busyShare) return
    setBusyShare(true)
    const { data: u } = await supabase
      .from('users').select('id, display_name, avatar_url, style_score').eq('id', me.id).maybeSingle()
    const { data: higher } = await supabase
      .from('users').select('id').gt('style_score', u?.style_score ?? 0)
    const { data: posts } = await supabase
      .from('posts').select('id').eq('user_id', me.id).eq('hidden', false)
    const res = await shareRankCard({
      user: u || me, rank: (higher?.length ?? 0) + 1, postsCount: posts?.length ?? 0,
    })
    setBusyShare(false)
    if (!res.ok) flash(res.reason === 'unsupported' ? t('share_unsupported') : t('share_failed'))
  }

  return (
    <div className="referral">
      <header className="referral__top">
        <button className="referral__close" onClick={onClose}>{t('back')}</button>
        <span className="referral__title">{t('referral')}</span>
        <span className="referral__spacer" />
      </header>
      <div className="referral__body">
        <div className="refcard">
          <div className="refcard__row">
            <div className="refstat">
              <div className="refstat__num">{stats?.invited ?? 0}</div>
              <div className="refstat__lbl">{t('ref_invited')}</div>
            </div>
            <div className="refstat">
              <div className="refstat__num">💧 {stats?.earned ?? 0}</div>
              <div className="refstat__lbl">{t('ref_earned')}</div>
            </div>
          </div>
        </div>

        <div className="reflink">
          <div className="reflink__label">{t('ref_your_link')}</div>
          <div className="reflink__box">
            <span className="reflink__url">{link || '…'}</span>
            <button className="reflink__copy" onClick={copyLink}>
              {copied ? '✓' : t('copy')}
            </button>
          </div>
        </div>

        <button className="ref-action ref-action--gold" onClick={shareLink}>{t('invite_friend')}</button>
        <button className="ref-action" onClick={shareStory} disabled={busyShare}>
          {busyShare ? '…' : t('share_story')}
        </button>

        <p className="ref-note">{t('ref_note')}</p>
      </div>
      {toast && <div className="ptoast">{toast}</div>}
    </div>
  )
}

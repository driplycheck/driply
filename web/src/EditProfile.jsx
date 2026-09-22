import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'
import { X, Camera } from 'lucide-react'
import { t } from './i18n.js'

export default function EditProfile({ me, onClose, onSaved }) {
  const [name, setName] = useState(me?.display_name || '')
  const [bio, setBio] = useState(me?.bio || '')
  const [gender, setGender] = useState(me?.gender ?? null)
  const [hideUsername, setHideUsername] = useState(!!me?.hide_username)
  const [allowDm, setAllowDm] = useState(!!me?.allow_dm)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(me?.avatar_url || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => () => {
    if (preview && preview !== me?.avatar_url) URL.revokeObjectURL(preview)
  }, [preview, me?.avatar_url])

  function onPickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview && preview !== me?.avatar_url) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function save() {
    const nick = name.trim()
    if (!nick) { setError(t('nick_empty')); return }
    setBusy(true)
    setError(null)
    try {
      let avatarUrl = me?.avatar_url || null
      if (file) {
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `avatars/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('outfits')
          .upload(path, file, { contentType: file.type || 'image/jpeg' })
        if (upErr) throw new Error('upload')
        avatarUrl = supabase.storage.from('outfits').getPublicUrl(path).data.publicUrl
      }

      const { error } = await supabase.functions.invoke('quick-handler', {
        body: {
          action: 'set_profile',
          initData: getInitData(),
          display_name: nick,
          avatar_url: avatarUrl,
          bio: bio.trim(),
          gender,
          hide_username: hideUsername,
          allow_dm: allowDm,
        },
      })
      if (error) {
        let code = 'UNKNOWN'
        try { code = (await error.context.json()).error } catch {}
        throw new Error(code)
      }
      onSaved({ display_name: nick, avatar_url: avatarUrl, bio: bio.trim(), gender, hide_username: hideUsername, allow_dm: allowDm })
    } catch (e) {
      setError(t('save_failed'))
      setBusy(false)
    }
  }

  return (
    <div className="pedit">
      <header className="pedit__top">
        <button className="pedit__close" onClick={onClose} aria-label={t('close_aria')}>
          <X size={20} strokeWidth={2.2} />
        </button>
        <span className="pedit__title">{t('profile')}</span>
        <button className="pedit__save" onClick={save} disabled={busy || !name.trim()}>
          {busy ? '…' : t('save')}
        </button>
      </header>

      <div className="pedit__body">
        <button className="pedit__ava" onClick={() => fileRef.current?.click()} aria-label={t('avatar_hint')}>
          {preview
            ? <img className={avatarTier(me?.style_score)} src={preview} alt="" />
            : <span className="pedit__ava-empty" />}
          <span className="pedit__cam"><Camera size={16} strokeWidth={2.2} /></span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} hidden />

        <label className="pfield">
          <span className="pfield__label">{t('nick_placeholder')}</span>
          <input className="pfield__input" maxLength={24} value={name} onChange={(e) => setName(e.target.value)} />
          <span className="pfield__count">{name.length} / 24</span>
        </label>
        <label className="pfield">
          <span className="pfield__label">{t('bio_label')}</span>
          <textarea className="pfield__input" placeholder={t('bio_placeholder')} maxLength={160} rows={3}
            value={bio} onChange={(e) => setBio(e.target.value)} />
          <span className="pfield__count">{bio.length} / 160</span>
        </label>

        <h2 className="pedit__sec">{t('gender')}</h2>
        <div className="pseg">
          {['male', 'female'].map((g) => (
            <button key={g} className={`pseg__opt ${gender === g ? 'pseg__opt--on' : ''}`}
              onClick={() => setGender(g)} aria-pressed={gender === g}>
              {t('gender_' + g)}
            </button>
          ))}
        </div>

        <h2 className="pedit__sec">{t('sec_privacy')}</h2>
        <div className="pswitches">
          <div className="pswitch">
            <span className="pswitch__text">
              <span className="pswitch__title">{t('hide_username')}</span>
              <span className="pswitch__hint">{t('hide_username_hint')}</span>
            </span>
            <button className={`toggle ${hideUsername ? 'toggle--on' : ''}`} onClick={() => setHideUsername((v) => !v)}
              aria-label={t('hide_username')} aria-pressed={hideUsername}>
              <span className="toggle__knob" />
            </button>
          </div>
          <div className="pswitch">
            <span className="pswitch__text">
              <span className="pswitch__title">{t('dm_allow')}</span>
              <span className="pswitch__hint">{hideUsername ? t('dm_needs_username') : t('dm_allow_hint')}</span>
            </span>
            <button className={`toggle ${allowDm ? 'toggle--on' : ''}`} onClick={() => setAllowDm((v) => !v)}
              aria-label={t('dm_allow')} aria-pressed={allowDm}>
              <span className="toggle__knob" />
            </button>
          </div>
        </div>

        {error && <div className="composer__err">{error}</div>}
      </div>
    </div>
  )
}

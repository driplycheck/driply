import { useEffect, useState } from 'react'
import { call, errorText } from './api.js'
import { supabase } from './supabase.js'
import DripCoin from './components/ui/DripCoin.jsx'
import { getStartParam } from './telegram.js'
import { track } from './analytics.js'
import { uploadImage } from './upload.js'
import { t } from './i18n.js'

export default function Onboarding({ tgUser, onDone }) {
  const [name, setName] = useState(tgUser?.first_name || '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(tgUser?.photo_url || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [gender, setGender] = useState(null)
  const [slotsLeft, setSlotsLeft] = useState(null)

  // человек ещё ничего не знает о продукте: показываем, что он получит, до анкеты
  useEffect(() => {
    supabase.rpc('first_drip_left').then(({ data }) => {
      if (typeof data === 'number' && data > 0) setSlotsLeft(data)
    })
  }, [])

  useEffect(() => () => {
    if (preview && preview !== tgUser?.photo_url) URL.revokeObjectURL(preview)
  }, [preview, tgUser?.photo_url])

  function onPickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview && preview !== tgUser?.photo_url) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    const nick = name.trim()
    if (!nick) { setError(t('nick_required')); return }
    setBusy(true)
    setError(null)
    try {
      let avatarUrl = tgUser?.photo_url || null
      if (file) avatarUrl = await uploadImage(file, 'avatar')

      const res = await call('set_profile', { gender, display_name: nick, avatar_url: avatarUrl })
      if (!res.ok) throw Object.assign(new Error(res.code), { code: res.code })
      // привязка реферера — ПОСЛЕ создания юзера, ДО первого поста
      const sp = getStartParam()
      if (sp && sp.startsWith('ref_')) {
        const code = sp.slice(4)
        if (code) {
          await call('set_referrer', { ref_code: code })  // не сработал — окно закроется после первого поста
        }
      }
      track('onboarding_done', { ref: Boolean(sp) })
      onDone({ display_name: nick, avatar_url: avatarUrl })
    } catch (e) {
      setError(e?.code ? errorText(e.code) : t('save_failed'))
      setBusy(false)
    }
  }

  return (
    <div className="onb">
      <div className="onb__body">
        <h1 className="onb__title">{t('onb_title')}</h1>
        <p className="onb__sub">{t('onb_sub')}</p>

        <div className="onb__gift">
          <span className="onb__gift-row"><DripCoin size={18} /> {t('onb_gift_start')}</span>
          <span className="onb__gift-row"><DripCoin size={18} /> {t('onb_gift_first')}</span>
          {slotsLeft !== null && <span className="onb__gift-note">{t('first_drip_left', { n: slotsLeft })}</span>}
        </div>

        <label className="onb__ava tier-base">
          {preview ? <img src={preview} alt="" /> : <span className="onb__plus">＋</span>}
          <input type="file" accept="image/*" onChange={onPickFile} hidden />
        </label>
        <span className="onb__avahint">{t('avatar_hint')}</span>

        <label className="onb__field">
          <span className="onb__label">{t('nick_placeholder')}</span>
          <input
            className="field onb__nick"
            placeholder={t('nick_placeholder')}
            maxLength={24}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className="onb__field">
          <span className="onb__label">{t('gender')} <i>{t('onb_optional')}</i></span>
          <div className="gender-pick">
            <button type="button" className={`gender-opt ${gender === 'male' ? 'gender-opt--on' : ''}`}
              onClick={() => setGender(gender === 'male' ? null : 'male')}>{t('gender_male')}</button>
            <button type="button" className={`gender-opt ${gender === 'female' ? 'gender-opt--on' : ''}`}
              onClick={() => setGender(gender === 'female' ? null : 'female')}>{t('gender_female')}</button>
          </div>
        </div>

        {error && <div className="composer__err">{error}</div>}

        <button className="onb__btn" onClick={submit} disabled={busy || !name.trim()}>
          {busy ? '…' : t('continue')}
        </button>

        <ol className="onb__steps">
          <li>{t('onb_step_post')}</li>
          <li>{t('onb_step_drips')}</li>
          <li>{t('onb_step_rank')}</li>
        </ol>
      </div>
    </div>
  )
}

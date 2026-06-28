import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

export default function Onboarding({ tgUser, onDone }) {
  const [name, setName] = useState(tgUser?.first_name || '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(tgUser?.photo_url || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [gender, setGender] = useState(null)

  function onPickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function submit() {
    const nick = name.trim()
    if (!nick) { setError('Придумай ник'); return }
    setBusy(true)
    setError(null)
    try {
      let avatarUrl = tgUser?.photo_url || null
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
        gender,
          initData: getInitData(),
          display_name: nick,
          avatar_url: avatarUrl,
        },
      })
      if (error) {
        let code = 'UNKNOWN'
        try { code = (await error.context.json()).error } catch {}
        throw new Error(code)
      }
      onDone({ display_name: nick, avatar_url: avatarUrl })
    } catch (e) {
      setError('Не получилось сохранить, попробуй ещё раз')
      setBusy(false)
    }
  }

  return (
    <div className="onb">
      <div className="onb__body">
        <h1 className="onb__title">Создай профиль</h1>
        <p className="onb__sub">Так тебя увидят в Driply</p>

        <label className="onb__ava tier-base">
          {preview ? <img src={preview} alt="" /> : <span className="onb__plus">＋</span>}
          <input type="file" accept="image/*" onChange={onPickFile} hidden />
        </label>
        <span className="onb__avahint">Нажми, чтобы сменить фото</span>

        <input
          className="field onb__nick"
          placeholder="Ник"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <div className="gender-pick">
          <button type="button" className={`gender-opt ${gender === 'male' ? 'gender-opt--on' : ''}`}
            onClick={() => setGender('male')}>👨 Парень</button>
          <button type="button" className={`gender-opt ${gender === 'female' ? 'gender-opt--on' : ''}`}
            onClick={() => setGender('female')}>👩 Девушка</button>
        </div>
        <button type="button" className="gender-skip" onClick={() => setGender(null)}>
          Пропустить
        </button>

        {error && <div className="composer__err">{error}</div>}

        <button className="onb__btn" onClick={submit} disabled={busy || !name.trim()}>
          {busy ? '…' : 'Продолжить'}
        </button>
      </div>
    </div>
  )
}

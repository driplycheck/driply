import { useRef, useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { avatarTier } from './tiers.js'

export default function EditProfile({ me, onClose, onSaved }) {
  const [name, setName] = useState(me?.display_name || '')
  const [bio, setBio] = useState(me?.bio || '')
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(me?.avatar_url || null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  function onPickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  async function save() {
    const nick = name.trim()
    if (!nick) { setError('Ник не может быть пустым'); return }
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
        },
      })
      if (error) {
        let code = 'UNKNOWN'
        try { code = (await error.context.json()).error } catch {}
        throw new Error(code)
      }
      onSaved({ display_name: nick, avatar_url: avatarUrl, bio: bio.trim() })
    } catch (e) {
      setError('Не получилось сохранить, попробуй ещё раз')
      setBusy(false)
    }
  }

  return (
    <div className="edit">
      <div className="edit__body">
        <div className="edit__top">
          <button className="edit__cancel" onClick={onClose}>Отмена</button>
          <span>Профиль</span>
          <button className="edit__save" onClick={save} disabled={busy || !name.trim()}>
            {busy ? '…' : 'Сохранить'}
          </button>
        </div>

        <div
          className={`onb__ava ${avatarTier(me?.style_score)}`}
          onClick={() => fileRef.current?.click()}
        >
          {preview ? <img src={preview} alt="" /> : <span className="onb__plus">＋</span>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: 'none' }} />
        <span className="onb__avahint">Нажми, чтобы сменить фото</span>

        <input
          className="field onb__nick"
          placeholder="Ник"
          maxLength={24}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <textarea
          className="field edit__bio"
          placeholder="О себе (био)"
          maxLength={160}
          rows={3}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
        />

        {error && <div className="composer__err">{error}</div>}
      </div>
    </div>
  )
}

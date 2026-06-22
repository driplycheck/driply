import { useState } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

const CATEGORIES = [
  { value: 'top', label: '👕 Верх' },
  { value: 'bottoms', label: '👖 Низ' },
  { value: 'shoes', label: '👟 Обувь' },
  { value: 'accessory', label: '🧢 Аксессуар' },
  { value: 'other', label: '✨ Другое' },
]

export default function PostComposer({ onClose, onPosted }) {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [items, setItems] = useState([])
  const [cat, setCat] = useState('top')
  const [brand, setBrand] = useState('')
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function onPickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function addItem() {
    if (!name.trim()) return
    setItems((arr) => [...arr, { category: cat, brand: brand.trim(), name: name.trim() }])
    setBrand('')
    setName('')
  }

  function removeItem(idx) {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }

  async function submit() {
    if (!file) { setError('Добавь фото'); return }
    setBusy(true)
    setError(null)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from('outfits')
        .upload(path, file, { contentType: file.type || 'image/jpeg' })
      if (upErr) throw new Error('upload')
      const { data: pub } = supabase.storage.from('outfits').getPublicUrl(path)

      const { error } = await supabase.functions.invoke('quick-handler', {
        body: {
          action: 'create_post',
          initData: getInitData(),
          media_url: pub.publicUrl,
          caption: caption.trim(),
          items,
        },
      })
      if (error) {
        let code = 'UNKNOWN'
        try { code = (await error.context.json()).error } catch {}
        throw new Error(code)
      }
      onPosted()
    } catch (e) {
      setError('Не удалось выложить, попробуй ещё раз')
      setBusy(false)
    }
  }

  return (
    <div className="composer">
      <header className="composer__top">
        <button className="composer__close" onClick={onClose}>✕</button>
        <span className="composer__title">Новый образ</span>
        <button className="composer__post" onClick={submit} disabled={busy}>
          {busy ? '…' : 'Выложить'}
        </button>
      </header>

      <div className="composer__body">
        <label className="photo">
          {preview ? <img src={preview} alt="" /> : <span>+ Добавить фото</span>}
          <input type="file" accept="image/*" onChange={onPickFile} hidden />
        </label>

        <input
          className="field"
          placeholder="Подпись (необязательно)"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
        />

        <div className="itemadd">
          <select className="field" value={cat} onChange={(e) => setCat(e.target.value)}>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input className="field" placeholder="Бренд" value={brand} onChange={(e) => setBrand(e.target.value)} />
          <input className="field" placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="itemadd__btn" onClick={addItem}>+</button>
        </div>

        {items.length > 0 && (
          <div className="chips">
            {items.map((it, idx) => (
              <span className="chip" key={idx} onClick={() => removeItem(idx)}>
                {it.brand} {it.name} ✕
              </span>
            ))}
          </div>
        )}

        {error && <div className="composer__err">{error}</div>}
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'

const EXTRA_CATEGORIES = [
  { value: 'dress', label: '👗 Платье' },
  { value: 'skirt', label: '👚 Юбка' },
  { value: 'bag', label: '👜 Сумка' },
]

const CATEGORIES = [
  { value: 'top', label: '👕 Верх' },
  { value: 'bottoms', label: '👖 Низ' },
  { value: 'shoes', label: '👟 Обувь' },
  { value: 'accessory', label: '🧢 Аксессуар' },
  { value: 'other', label: '✨ Другое' },
  ...EXTRA_CATEGORIES,
]

function StylePicker({ styles, selectedId, onSelect }) {
  if (styles.length === 0) return null

  return (
    <div className="stylepick">
      <div className="stylepick__lbl">Стиль (необязательно)</div>
      <div className="stylepick__row">
        {styles.map((style) => (
          <button
            key={style.id}
            className={`stylechip ${selectedId === style.id ? 'stylechip--on' : ''}`}
            onClick={() => onSelect(style.id)}
          >
            {style.emoji} {style.name_ru || style.name_en}
          </button>
        ))}
      </div>
    </div>
  )
}

function SuggestionList({ suggestions, onSelect }) {
  if (suggestions.length === 0) return null

  return (
    <div className="suggestions">
      {suggestions.map((suggestion) => (
        <button className="suggestion" key={suggestion} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => onSelect(suggestion)}>
          {suggestion}
        </button>
      ))}
    </div>
  )
}

function ItemForm({ categories, category, brand, name, brandSuggestions, nameSuggestions, onCategory, onBrand, onName, onBrandSelect, onNameSelect, onAdd }) {
  return (
    <div className="itemadd">
      <select className="field" value={category} onChange={(e) => onCategory(e.target.value)}>
        {categories.map((item) => (
          <option key={item.value} value={item.value}>{item.label}</option>
        ))}
      </select>
      <div className="field-wrap">
        <input className="field" placeholder="Бренд" value={brand} onChange={(e) => onBrand(e.target.value)} />
        <SuggestionList suggestions={brandSuggestions} onSelect={onBrandSelect} />
      </div>
      <div className="field-wrap">
        <input className="field" placeholder="Название" value={name} onChange={(e) => onName(e.target.value)} />
        <SuggestionList suggestions={nameSuggestions} onSelect={onNameSelect} />
      </div>
      <button className="itemadd__btn" onClick={onAdd}>+</button>
    </div>
  )
}

function AddedItems({ items, onRemove }) {
  if (items.length === 0) return null

  return (
    <div className="chips">
      {items.map((item, index) => (
        <span className="chip" key={index} onClick={() => onRemove(index)}>
          {item.brand} {item.name} ✕
        </span>
      ))}
    </div>
  )
}

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
  const [styles, setStyles] = useState([])
  const [styleId, setStyleId] = useState(null)
  const [brandSuggestions, setBrandSuggestions] = useState([])
  const [nameSuggestions, setNameSuggestions] = useState([])

  useEffect(() => {
    let active = true
    supabase.from('styles')
      .select('id, name_ru, name_en, emoji')
      .eq('active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (error) { console.error('STYLES_LOAD_ERROR', error); alert('styles error: ' + error.message) }
        else { console.log('STYLES_LOADED', data?.length, data) }
        if (active) setStyles(data || [])
      })
    return () => { active = false }
  }, [])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  useEffect(() => {
    const term = brand.trim()
    if (term.length < 2) {
      setBrandSuggestions([])
      return
    }
    let active = true
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('items')
        .select('brand')
        .ilike('brand', `%${term}%`)
        .not('brand', 'is', null)
        .limit(24)
      if (!active) return
      const brands = [...new Set((data || []).map((item) => item.brand).filter(Boolean))]
      setBrandSuggestions(brands.slice(0, 6))
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [brand])

  useEffect(() => {
    const term = name.trim()
    if (term.length < 2) {
      setNameSuggestions([])
      return
    }
    let active = true
    const timer = setTimeout(async () => {
      let query = supabase
        .from('items')
        .select('name')
        .ilike('name', `%${term}%`)
        .limit(24)
      if (brand.trim()) query = query.ilike('brand', brand.trim())
      const { data } = await query
      if (!active) return
      const names = [...new Set((data || []).map((item) => item.name).filter(Boolean))]
      setNameSuggestions(names.slice(0, 6))
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [name, brand])

  function onPickFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  function addItem() {
    if (!name.trim()) return
    setItems((arr) => [...arr, { category: cat, brand: brand.trim(), name: name.trim() }])
    setBrand('')
    setName('')
    setBrandSuggestions([])
    setNameSuggestions([])
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
          style_id: styleId,
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

        <StylePicker
          styles={styles}
          selectedId={styleId}
          onSelect={(id) => setStyleId((current) => (current === id ? null : id))}
        />
        <ItemForm
          categories={CATEGORIES}
          category={cat}
          brand={brand}
          name={name}
          brandSuggestions={brandSuggestions}
          nameSuggestions={nameSuggestions}
          onCategory={setCat}
          onBrand={setBrand}
          onName={setName}
          onBrandSelect={(value) => { setBrand(value); setBrandSuggestions([]) }}
          onNameSelect={(value) => { setName(value); setNameSuggestions([]) }}
          onAdd={addItem}
        />
        <AddedItems items={items} onRemove={removeItem} />

        {error && <div className="composer__err">{error}</div>}
      </div>
    </div>
  )
}

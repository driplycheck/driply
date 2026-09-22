import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { matchBrands } from './brands.js'
import { X, Check, Tag, ImagePlus } from 'lucide-react'
import { t, styleName } from './i18n.js'
import DripCoin from './components/ui/DripCoin.jsx'
import Chip from './components/ui/Chip.jsx'
import GlassBadge from './components/ui/GlassBadge.jsx'

const CAPTION_MAX = 300
// экономика: первый образ +300, следующие +100 (create_post)
const REWARD_FIRST = 300
const REWARD_NEXT = 100

const CATEGORY_VALUES = ['top', 'bottoms', 'shoes', 'accessory', 'other', 'dress', 'skirt', 'bag']

// '%', '_' и '*' — wildcard-символы ilike, из пользовательского ввода их убираем
function cleanTerm(value) {
  return value.trim().replace(/[%_*]/g, ' ').replace(/\s+/g, ' ').trim()
}

// «Stussy» и «stussy» — один и тот же бренд, в списке он должен быть один раз
function dedupe(values) {
  const seen = new Set()
  const out = []
  for (const value of values) {
    const text = (value || '').trim()
    const key = text.toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(text)
  }
  return out
}

// Подсказки из таблицы items: debounce, чтобы не дёргать базу на каждый символ
function useItemSuggestions(column, term, brandFilter = '') {
  const [remote, setRemote] = useState([])
  const clean = cleanTerm(term)
  const cleanBrand = cleanTerm(brandFilter)

  useEffect(() => {
    if (clean.length < 2) {
      setRemote([])
      return
    }
    let active = true
    const timer = setTimeout(async () => {
      let query = supabase
        .from('items')
        .select(column)
        .ilike(column, `%${clean}%`)
        .not(column, 'is', null)
        .limit(24)
      if (cleanBrand) query = query.ilike('brand', `%${cleanBrand}%`)
      const { data, error } = await query
      if (!active || error) return
      setRemote(dedupe((data || []).map((row) => row[column])).slice(0, 6))
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [column, clean, cleanBrand])

  return remote
}

function StylePicker({ styles, selectedId, onSelect }) {
  if (styles.length === 0) return null

  return (
    <section className="csec">
      <h2 className="csec__title">{t('style_title')}</h2>
      <div className="stylepick">
        {styles.map((style) => {
          const on = selectedId === style.id
          return (
            <Chip key={style.id} active={on} onClick={() => onSelect(style.id)}>
              {on && <Check size={14} strokeWidth={3} className="stylepick__check" />}
              {styleName(style)}
            </Chip>
          )
        })}
      </div>
    </section>
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
  const [focused, setFocused] = useState(null)
  const nameRef = useRef(null)

  return (
    <div className="itemadd">
      <select className="field" value={category} onChange={(e) => onCategory(e.target.value)}>
        {categories.map((value) => (
          <option key={value} value={value}>{t(`cat_${value}`)}</option>
        ))}
      </select>
      <div className="field-wrap">
        <input
          className="field"
          placeholder={t('brand_placeholder')}
          value={brand}
          onChange={(e) => onBrand(e.target.value)}
          onFocus={() => setFocused('brand')}
          onBlur={() => setFocused(null)}
        />
        {focused === 'brand' && (
          <SuggestionList
            suggestions={brandSuggestions}
            onSelect={(value) => { onBrandSelect(value); nameRef.current?.focus() }}
          />
        )}
      </div>
      <div className="field-wrap">
        <input
          ref={nameRef}
          className="field"
          placeholder={t('name_placeholder')}
          value={name}
          onChange={(e) => onName(e.target.value)}
          onFocus={() => setFocused('name')}
          onBlur={() => setFocused(null)}
        />
        {focused === 'name' && (
          <SuggestionList
            suggestions={nameSuggestions}
            onSelect={(value) => { onNameSelect(value); nameRef.current?.blur() }}
          />
        )}
      </div>
      <button className="itemadd__btn" onClick={onAdd} disabled={!name.trim()}>+</button>
    </div>
  )
}

function AddedItems({ items, onRemove }) {
  if (items.length === 0) return null

  return (
    <div className="chips">
      {items.map((item, index) => (
        <span className="chip" key={index} onClick={() => onRemove(index)}>
          {[item.brand, item.name].filter(Boolean).join(' ')} ✕
        </span>
      ))}
    </div>
  )
}

export default function PostComposer({ selfId, onClose, onPosted, firstPost = false }) {
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
  const [tagItems, setTagItems] = useState(false)
  const [hasPosts, setHasPosts] = useState(firstPost ? false : null)
  const reward = hasPosts === false ? REWARD_FIRST : hasPosts ? REWARD_NEXT : null

  const remoteBrands = useItemSuggestions('brand', brand)
  const nameSuggestions = useItemSuggestions('name', name, brand)
  // сначала известные бренды (отвечают сразу), потом то, что уже вводили другие
  const brandSuggestions = useMemo(
    () => dedupe([...matchBrands(brand), ...remoteBrands]).slice(0, 6),
    [brand, remoteBrands],
  )

  useEffect(() => {
    let active = true
    supabase.from('styles')
      .select('id, name_ru, name_en, emoji')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (active) setStyles(data || [])
      })
    return () => { active = false }
  }, [])

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview)
  }, [preview])

  // награда на кнопке: первый образ даёт больше
  useEffect(() => {
    if (firstPost || !selfId) return
    let active = true
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', selfId)
      .then(({ count, error }) => { if (active && !error) setHasPosts((count ?? 0) > 0) })
    return () => { active = false }
  }, [firstPost, selfId])

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
  }

  function removeItem(idx) {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }

  async function submit() {
    if (!file) { setError(t('photo_required')); return }
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

      const { data: result, error } = await supabase.functions.invoke('quick-handler', {
        body: {
          action: 'create_post',
          initData: getInitData(),
          media_url: pub.publicUrl,
          caption: caption.trim(),
          items: tagItems ? items : [],
          style_id: styleId,
        },
      })
      if (error) {
        let code = 'UNKNOWN'
        try { code = (await error.context.json()).error } catch {}
        throw new Error(code)
      }
      onPosted(result)
    } catch (e) {
      setError(t('post_failed'))
      setBusy(false)
    }
  }

  return (
    <div className="composer">
      <header className="composer__top">
        <button className="composer__close" onClick={onClose} aria-label={t('close_aria')}>
          <X size={20} strokeWidth={2.2} />
        </button>
        <span className="composer__title">{firstPost ? t('composer_first') : t('composer_new')}</span>
        <span className="composer__spacer" />
      </header>

      <div className="composer__body">
        <label className={`photo ${preview ? 'photo--set' : ''}`}>
          {preview ? (
            <>
              <img src={preview} alt="" />
              <span className="photo__badge"><GlassBadge>{t('photo_change')}</GlassBadge></span>
            </>
          ) : (
            <span className="photo__empty">
              <span className="photo__plus"><ImagePlus size={26} strokeWidth={1.8} /></span>
              <span className="photo__label">{t('add_photo_title')}</span>
              {firstPost && <span className="photo__hint">{t('first_post_hint')}</span>}
            </span>
          )}
          <input type="file" accept="image/*" onChange={onPickFile} hidden />
        </label>

        <div className="caption-box">
          <textarea
            className="caption-box__input"
            placeholder={t('caption_placeholder')}
            value={caption}
            maxLength={CAPTION_MAX}
            rows={2}
            onChange={(e) => setCaption(e.target.value)}
          />
          <span className="caption-box__count">{caption.length} / {CAPTION_MAX}</span>
        </div>

        <StylePicker
          styles={styles}
          selectedId={styleId}
          onSelect={(id) => setStyleId((current) => (current === id ? null : id))}
        />

        <section className="tagrow">
          <span className="tagrow__icon"><Tag size={18} strokeWidth={1.9} /></span>
          <span className="tagrow__text">
            <span className="tagrow__title">{t('tag_items')}</span>
            <span className="tagrow__hint">{t('tag_items_hint')}</span>
          </span>
          <button className={`toggle ${tagItems ? 'toggle--on' : ''}`} onClick={() => setTagItems((v) => !v)}
            aria-label={t('tag_items')} aria-pressed={tagItems}>
            <span className="toggle__knob" />
          </button>
        </section>

        {tagItems && (
          <>
            <ItemForm
              categories={CATEGORY_VALUES}
              category={cat}
              brand={brand}
              name={name}
              brandSuggestions={brandSuggestions}
              nameSuggestions={nameSuggestions}
              onCategory={setCat}
              onBrand={setBrand}
              onName={setName}
              onBrandSelect={setBrand}
              onNameSelect={setName}
              onAdd={addItem}
            />
            <AddedItems items={items} onRemove={removeItem} />
          </>
        )}

        {error && <div className="composer__err">{error}</div>}
      </div>

      <div className="composer__footer">
        <button className="publish" onClick={submit} disabled={busy || !file}>
          {busy ? '…' : t('publish')}
          {!busy && reward && (
            <span className="publish__reward"><DripCoin size={14} /> +{reward}</span>
          )}
        </button>
      </div>
    </div>
  )
}

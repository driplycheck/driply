import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from './supabase.js'
import { getInitData } from './telegram.js'
import { matchBrands } from './brands.js'
import { X, Check, Tag, ImagePlus, Plus } from 'lucide-react'
import { t, styleName } from './i18n.js'
import { track } from './analytics.js'
import DripCoin from './components/ui/DripCoin.jsx'
import Chip from './components/ui/Chip.jsx'
import GlassBadge from './components/ui/GlassBadge.jsx'

const CAPTION_MAX = 300
const MAX_PHOTOS = 3
const MAX_STYLES = 2
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

function StylePicker({ styles, selectedIds, onToggle }) {
  if (styles.length === 0) return null
  const full = selectedIds.length >= MAX_STYLES

  return (
    <section className="csec">
      <h2 className="csec__title">{t('style_title')} <span className="csec__hint">{t('style_max', { n: MAX_STYLES })}</span></h2>
      <div className={`stylepick ${full ? 'stylepick--full' : ''}`}>
        {styles.map((style) => {
          const on = selectedIds.includes(style.id)
          return (
            <Chip key={style.id} active={on} onClick={() => onToggle(style.id)}>
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

function ItemForm({ categories, category, brand, name, price, brandSuggestions, nameSuggestions, onCategory, onBrand, onName, onPrice, onBrandSelect, onNameSelect, onAdd }) {
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
      <input
        className="field itemadd__price"
        placeholder={t('price_placeholder')}
        inputMode="numeric"
        value={price}
        onChange={(e) => onPrice(e.target.value.replace(/\D/g, '').slice(0, 8))}
      />
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
          {[item.brand, item.name].filter(Boolean).join(' ')}
          {item.price != null && <b> · {Number(item.price).toLocaleString('ru-RU')} ₽</b>} ✕
        </span>
      ))}
    </div>
  )
}

export default function PostComposer({ selfId, onClose, onPosted, firstPost = false }) {
  const [photos, setPhotos] = useState([]) // [{ file, url }], первое — обложка
  const photosRef = useRef(photos)
  photosRef.current = photos
  const [caption, setCaption] = useState('')
  const [items, setItems] = useState([])
  const [cat, setCat] = useState('top')
  const [brand, setBrand] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [styles, setStyles] = useState([])
  const [styleIds, setStyleIds] = useState([])
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

  // превью — object URL: освобождаем при уходе с экрана
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  // награда на кнопке: первый образ даёт больше
  useEffect(() => {
    if (firstPost || !selfId) return
    let active = true
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', selfId)
      .then(({ count, error }) => { if (active && !error) setHasPosts((count ?? 0) > 0) })
    return () => { active = false }
  }, [firstPost, selfId])

  // slot < длины — замена фото, иначе добавление
  function pickPhoto(slot, e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setPhotos((arr) => {
      const next = [...arr]
      if (next[slot]) URL.revokeObjectURL(next[slot].url)
      next[Math.min(slot, next.length)] = { file: f, url: URL.createObjectURL(f) }
      return next.slice(0, MAX_PHOTOS)
    })
  }

  function removePhoto(i) {
    setPhotos((arr) => {
      URL.revokeObjectURL(arr[i].url)
      return arr.filter((_, j) => j !== i)
    })
  }

  function toggleStyle(id) {
    setStyleIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id)
      : ids.length >= MAX_STYLES ? ids : [...ids, id])
  }

  function addItem() {
    if (!name.trim()) return
    setItems((arr) => [...arr, { category: cat, brand: brand.trim(), name: name.trim(), price: price ? Number(price) : null }])
    setBrand('')
    setName('')
    setPrice('')
  }

  function removeItem(idx) {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }

  async function uploadPhoto(file) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage
      .from('outfits')
      .upload(path, file, { contentType: file.type || 'image/jpeg' })
    if (error) throw new Error('upload')
    return supabase.storage.from('outfits').getPublicUrl(path).data.publicUrl
  }

  async function submit() {
    if (photos.length === 0) { setError(t('photo_required')); return }
    setBusy(true)
    setError(null)
    try {
      const urls = await Promise.all(photos.map((p) => uploadPhoto(p.file)))
      const { data: result, error } = await supabase.functions.invoke('quick-handler', {
        body: {
          action: 'create_post',
          initData: getInitData(),
          media_url: urls[0],
          extra_media: urls.slice(1),
          caption: caption.trim(),
          items: tagItems ? items : [],
          style_id: styleIds[0] ?? null,
          style2_id: styleIds[1] ?? null,
        },
      })
      if (error) {
        let code = 'UNKNOWN'
        try { code = (await error.context.json()).error } catch {}
        throw new Error(code)
      }
      track('post_created', { photos: urls.length, styles: styleIds.length, items: tagItems ? items.length : 0 })
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
        {photos.length === 0 ? (
          <label className="photo">
            <span className="photo__empty">
              <span className="photo__plus"><ImagePlus size={26} strokeWidth={1.8} /></span>
              <span className="photo__label">{t('add_photo_title')}</span>
              <span className="photo__hint">{firstPost ? t('first_post_hint') : t('photos_hint', { n: MAX_PHOTOS })}</span>
            </span>
            <input type="file" accept="image/*" onChange={(e) => pickPhoto(0, e)} hidden />
          </label>
        ) : (
          <div className="photos">
            <label className="photos__cover">
              <img src={photos[0].url} alt="" />
              <span className="photo__badge"><GlassBadge>{t('photo_cover')}</GlassBadge></span>
              <input type="file" accept="image/*" onChange={(e) => pickPhoto(0, e)} hidden />
            </label>
            <div className="photos__side">
              {[1, 2].map((i) => photos[i] ? (
                <div className="photos__thumb" key={i}>
                  <img src={photos[i].url} alt="" />
                  <button className="photos__remove" onClick={() => removePhoto(i)} aria-label={t('photo_remove')}>
                    <X size={14} strokeWidth={2.6} />
                  </button>
                </div>
              ) : i === photos.length ? (
                <label className="photos__add" key={i}>
                  <span className="photos__add-plus"><Plus size={18} strokeWidth={2.4} /></span>
                  <span>{t('photo_more')}</span>
                  <input type="file" accept="image/*" onChange={(e) => pickPhoto(i, e)} hidden />
                </label>
              ) : <span className="photos__slot" key={i} />)}
            </div>
          </div>
        )}

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

        <StylePicker styles={styles} selectedIds={styleIds} onToggle={toggleStyle} />

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
              price={price}
              brandSuggestions={brandSuggestions}
              nameSuggestions={nameSuggestions}
              onCategory={setCat}
              onBrand={setBrand}
              onName={setName}
              onPrice={setPrice}
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
        <button className="publish" onClick={submit} disabled={busy || photos.length === 0}>
          {busy ? '…' : t('publish')}
          {!busy && reward && (
            <span className="publish__reward"><DripCoin size={14} /> +{reward}</span>
          )}
        </button>
      </div>
    </div>
  )
}

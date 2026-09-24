import { useState, useEffect, useMemo, useRef } from 'react'
import { call, errorText } from './api.js'
import { supabase } from './supabase.js'
import { haptic, canOpenCamera } from './telegram.js'
import { matchBrands } from './brands.js'
import { X, Check, Tag, ImagePlus, Plus, Camera } from 'lucide-react'
import { t, styleName } from './i18n.js'
import { track } from './analytics.js'
import { uploadImage } from './upload.js'
import { checkPhotos, warmUpNsfw } from './nsfw.js'
import DripCoin from './components/ui/DripCoin.jsx'
import Chip from './components/ui/Chip.jsx'
import GlassBadge from './components/ui/GlassBadge.jsx'
import { CategoryIcon, StyleIcon } from './components/ui/Icon.jsx'

const CAPTION_MAX = 300
// Черновик — всё кроме фото: файл в localStorage не положишь, а перезаливать его молча нельзя.
const DRAFT_KEY = 'driply_draft'
const CAMERA = canOpenCamera()
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
              {on ? <Check size={14} strokeWidth={3} /> : <StyleIcon slug={style.slug} size={15} />}
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
      <div className="catpick">
        {categories.map((value) => (
          <Chip key={value} active={category === value} onClick={() => onCategory(value)}>
            <CategoryIcon category={value} size={15} /> {t(`cat_${value}`)}
          </Chip>
        ))}
      </div>
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
          <CategoryIcon category={item.category} size={13} /> {[item.brand, item.name].filter(Boolean).join(' ')}
          {item.price != null && <b> · {Number(item.price).toLocaleString('ru-RU')} ₽</b>} ✕
        </span>
      ))}
    </div>
  )
}

export default function PostComposer({ selfId, onClose, onPosted, firstPost = false, editPost = null }) {
  const editing = Boolean(editPost)
  const [photos, setPhotos] = useState([]) // [{ file, url }], первое — обложка
  const photosRef = useRef(photos)
  photosRef.current = photos
  const [caption, setCaption] = useState(editPost?.caption || '')
  const [items, setItems] = useState(() => (editPost?.items || []).map((i) => ({
    category: i.category || 'other', brand: i.brand || '', name: i.name || '', price: i.price ?? null,
  })))
  const [cat, setCat] = useState('top')
  const [brand, setBrand] = useState('')
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState(null)
  const [styles, setStyles] = useState([])
  const [styleIds, setStyleIds] = useState(() => [editPost?.style_id, editPost?.style2_id].filter(Boolean))
  // форма вещей открыта по умолчанию: пока она была за выключателем, вещи указывали в 3 постах из 14
  const [tagItems, setTagItems] = useState(editPost ? Boolean(editPost.items?.length) : true)
  const [draftRestored, setDraftRestored] = useState(false)
  const [hasPosts, setHasPosts] = useState(firstPost ? false : null)
  const [slotsLeft, setSlotsLeft] = useState(null)
  const openedAt = useRef(Date.now())
  const pendingPick = useRef(null)   // какой способ выбрали и когда — чтобы поймать отказ в системном окне
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
      .select('id, slug, name_ru, name_en')
      .eq('active', true)
      .order('sort_order')
      .then(({ data }) => {
        if (active) setStyles(data || [])
      })
    return () => { active = false }
  }, [])

  // превью — object URL: освобождаем при уходе с экрана
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), [])

  // вернуть незаконченный образ: подпись, стили и вещи переживают закрытие экрана
  useEffect(() => {
    if (editing) {
      track('post_edit_opened', { post: editPost.id })
      return
    }
    let draft = null
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') } catch { draft = null }
    const hasContent = draft && (draft.caption || draft.styleIds?.length || draft.items?.length)
    if (hasContent) {
      setCaption(draft.caption || '')
      setStyleIds(Array.isArray(draft.styleIds) ? draft.styleIds.slice(0, MAX_STYLES) : [])
      setItems(Array.isArray(draft.items) ? draft.items : [])
      setTagItems(Boolean(draft.items?.length))
      setDraftRestored(true)
    }
    track('composer_opened', { draft: Boolean(hasContent), first: firstPost })
    // статус first drip — первым 50 авторам; на первом образе это самый весомый аргумент
    if (firstPost) {
      supabase.rpc('first_drip_left').then(({ data }) => {
        if (typeof data === 'number' && data > 0) setSlotsLeft(data)
      })
    }
    warmUpNsfw()   // модель успеет загрузиться, пока человек готовит образ
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (editing) return   // правим опубликованное — черновик нового образа трогать нельзя
    const draft = { caption, styleIds, items }
    const empty = !caption && styleIds.length === 0 && items.length === 0
    try {
      if (empty) localStorage.removeItem(DRAFT_KEY)
      else localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
    } catch {}
  }, [caption, styleIds, items, editing])

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY) } catch {}
    setCaption(''); setStyleIds([]); setItems([]); setTagItems(false); setDraftRestored(false)
  }

  // награда на кнопке: первый образ даёт больше
  useEffect(() => {
    if (firstPost || !selfId) return
    let active = true
    supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', selfId)
      .then(({ count, error }) => { if (active && !error) setHasPosts((count ?? 0) > 0) })
    return () => { active = false }
  }, [firstPost, selfId])

  // slot < длины — замена фото, иначе добавление
  // Системное окно выбора файла не сообщает об отмене: событие change просто не приходит.
  // Ловим возврат фокуса — если файла так и нет, человек передумал, и это надо видеть в данных.
  function startPick(way) {
    pendingPick.current = { way, at: Date.now() }
    track('photo_way', { way, first: photos.length === 0 })
  }

  useEffect(() => {
    function onBack() {
      const pick = pendingPick.current
      if (!pick || Date.now() - pick.at < 400) return
      setTimeout(() => {
        if (pendingPick.current !== pick) return   // файл всё-таки пришёл
        pendingPick.current = null
        track('photo_cancelled', { way: pick.way })
      }, 1200)
    }
    window.addEventListener('focus', onBack)
    document.addEventListener('visibilitychange', onBack)
    return () => {
      window.removeEventListener('focus', onBack)
      document.removeEventListener('visibilitychange', onBack)
    }
  }, [])

  function pickPhoto(slot, e) {
    const f = e.target.files?.[0]
    e.target.value = ''
    pendingPick.current = null
    if (!f) return
    if (photos.length === 0) track('photo_added', { n: 1 })
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

  // вещь привязана к категории: сменил категорию — это уже другая вещь,
  // иначе бренд и модель от топа молча уезжают в джинсы
  function changeCategory(next) {
    if (next === cat) return
    setCat(next)
    setBrand('')
    setName('')
    setPrice('')
  }

  function addItem() {
    if (!name.trim()) return
    setItems((arr) => [...arr, { category: cat, brand: brand.trim(), name: name.trim(), price: price ? Number(price) : null }])
    setBrand('')
    setName('')
    setPrice('')
  }

  // на каком шаге закрыли экран: единственный способ понять, где теряются люди
  function closeComposer() {
    if (!editing) {
      const stage = photos.length === 0 ? (pendingPick.current ? 'picker' : 'empty')
        : (caption || styleIds.length || items.length) ? 'ready' : 'photo'
      track('composer_closed', { stage, sec: Math.round((Date.now() - openedAt.current) / 1000) })
    }
    onClose()
  }

  // правка опубликованного: фото остаётся прежним, меняются подпись, стили и вещи
  async function saveEdit() {
    setBusy(true)
    setError(null)
    const res = await call('update_post', {
      post_id: editPost.id,
      caption: caption.trim(),
      items: tagItems ? items : [],
      style_id: styleIds[0] ?? null,
      style2_id: styleIds[1] ?? null,
    })
    setBusy(false)
    if (!res.ok) { setError(errorText(res.code)); return }
    haptic('medium')
    track('post_edited', { post: editPost.id, items: tagItems ? items.length : 0 })
    onPosted({ ...res.data, edited: true })
  }

  function removeItem(idx) {
    setItems((arr) => arr.filter((_, i) => i !== idx))
  }


  async function submit() {
    if (editing) return saveEdit()
    if (photos.length === 0) { setError(t('photo_required')); return }
    setBusy(true)
    setError(null)
    try {
      // проверка на откровенный контент — до загрузки, чтобы такое фото вообще не попало в хранилище
      setChecking(true)
      const verdict = await checkPhotos(photos.map((p) => p.file))
      setChecking(false)
      if (!verdict.ok) {
        track('nsfw_blocked', { score: verdict.score })
        setError(t('nsfw_blocked'))
        setBusy(false)
        return
      }

      const urls = await Promise.all(photos.map((p) => uploadImage(p.file, 'post')))
      const res = await call('create_post', {
        media_url: urls[0],
        extra_media: urls.slice(1),
        caption: caption.trim(),
        items: tagItems ? items : [],
        style_id: styleIds[0] ?? null,
        style2_id: styleIds[1] ?? null,
      })
      if (!res.ok) throw Object.assign(new Error(res.code), { code: res.code })
      const result = res.data
      haptic('heavy')
      clearDraft()
      track('post_created', { photos: urls.length, styles: styleIds.length, items: tagItems ? items.length : 0 })
      onPosted(result)
    } catch (e) {
      setChecking(false)
      track('publish_failed', { code: String(e?.message || 'UNKNOWN').slice(0, 40) })
      setError(e?.code ? errorText(e.code) : t('post_failed'))
      setBusy(false)
    }
  }

  return (
    <div className="composer">
      <header className="composer__top">
        <button className="composer__close" onClick={closeComposer} aria-label={t('close_aria')}>
          <X size={20} strokeWidth={2.2} />
        </button>
        <span className="composer__title">{editing ? t('composer_edit') : firstPost ? t('composer_first') : t('composer_new')}</span>
        <span className="composer__spacer" />
      </header>

      <div className="composer__body">
        {editing ? (
          // фото не меняем: за него уже отдали дрипы, подменять картинку под голосами нечестно
          <div className="editphotos">
            <div className="editphotos__row">
              {[editPost.media_url, ...(editPost.extra_media || [])].filter(Boolean).map((url) => (
                <img key={url} className="editphotos__img" src={url} alt="" />
              ))}
            </div>
            <span className="editphotos__note">{t('edit_photo_locked')}</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="photo photo--empty">
            <span className="photo__empty">
              <span className="photo__label">{t('add_photo_title')}</span>
              <span className="photo__hint">{firstPost ? t('first_post_hint') : t('photos_hint', { n: MAX_PHOTOS })}</span>
              {firstPost && slotsLeft !== null && (
                <span className="photo__slots">{t('first_drip_left', { n: slotsLeft })}</span>
              )}
              <span className="photo__ways">
                {/* отдельная «Снять» — только там, где capture реально открывает камеру */}
                {CAMERA && (
                  <label className="photoway photoway--primary" onClick={() => startPick('camera')}>
                    <Camera size={20} strokeWidth={2} /> {t('photo_camera')}
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => pickPhoto(0, e)} hidden />
                  </label>
                )}
                <label className={`photoway ${CAMERA ? '' : 'photoway--primary'}`} onClick={() => startPick('gallery')}>
                  <ImagePlus size={20} strokeWidth={2} /> {CAMERA ? t('photo_gallery') : t('photo_pick')}
                  <input type="file" accept="image/*" onChange={(e) => pickPhoto(0, e)} hidden />
                </label>
              </span>
            </span>
          </div>
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

        {draftRestored && (
          <div className="draftbar">
            <span>{t('draft_restored')}</span>
            <button onClick={clearDraft}>{t('draft_clear')}</button>
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
              onCategory={changeCategory}
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
        <button className="publish" onClick={submit} disabled={busy || (!editing && photos.length === 0)}>
          {checking ? t('nsfw_checking') : busy ? '…' : editing ? t('save') : t('publish')}
          {!busy && !editing && reward && (
            <span className="publish__reward"><DripCoin size={14} /> +{reward}</span>
          )}
        </button>
      </div>
    </div>
  )
}

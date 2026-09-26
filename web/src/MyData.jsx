import { useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { call, errorText } from './api.js'
import { t } from './i18n.js'
import './legal/legal.css'

// Копия своих данных и удаление аккаунта — права по ст. 14 и 9 152-ФЗ,
// сделанные кнопками, а не перепиской с поддержкой.
export default function MyData({ mode = 'view', onClose, onDeleted }) {
  const [data, setData] = useState(null)
  const [word, setWord] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  async function load() {
    setBusy(true); setError(null)
    const res = await call('export_data')
    setBusy(false)
    if (!res.ok) { setError(errorText(res.code)); return }
    setData(JSON.stringify(res.data, null, 2))
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(data)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { setError(t('err_generic')) }
  }

  async function remove() {
    if (word.trim().toUpperCase() !== t('del_word')) return
    setBusy(true); setError(null)
    const res = await call('delete_account')
    setBusy(false)
    if (!res.ok) { setError(errorText(res.code)); return }
    onDeleted?.()
  }

  const isDelete = mode === 'delete'

  return (
    <div className="legal">
      <header className="scr-top">
        <button className="scr-back" onClick={onClose} aria-label={t('back')}>
          <ChevronLeft size={22} strokeWidth={2} />
        </button>
        <span className="scr-title">{isDelete ? t('del_title') : t('data_title')}</span>
        <span className="scr-spacer" />
      </header>

      <div className="legal__body">
        {isDelete ? (
          <>
            <p className="legal__intro">{t('del_warn')}</p>
            <label className="onb__field">
              <span className="onb__label">{t('del_confirm_hint')}</span>
              <input className="field" value={word} onChange={(e) => setWord(e.target.value)} placeholder={t('del_word')} />
            </label>
            {error && <div className="composer__err">{error}</div>}
            <button
              className="mydata__danger"
              onClick={remove}
              disabled={busy || word.trim().toUpperCase() !== t('del_word')}
            >
              {busy ? '…' : t('del_do')}
            </button>
          </>
        ) : (
          <>
            <p className="legal__intro">{t('data_intro')}</p>
            {!data ? (
              <button className="consent__btn" onClick={load} disabled={busy}>{busy ? '…' : t('data_get')}</button>
            ) : (
              <>
                <button className="consent__btn" onClick={copy}>{copied ? t('data_copied') : t('data_copy')}</button>
                <pre className="mydata__dump">{data}</pre>
              </>
            )}
            {error && <div className="composer__err">{error}</div>}
          </>
        )}
      </div>
    </div>
  )
}

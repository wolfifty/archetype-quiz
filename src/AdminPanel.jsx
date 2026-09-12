import { useState, useEffect, useRef } from 'react'

function getInitData() {
  return window.Telegram?.WebApp?.initData
}

// Сжимаем фото в браузере перед отправкой — иначе большие фото (3-5 МБ)
// не проходят через лимит размера запроса на Vercel (~4.5 МБ).
function compressImage(file, maxDim = 1280, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width)
            width = maxDim
          } else {
            width = Math.round((width * maxDim) / height)
            height = maxDim
          }
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.onerror = reject
      img.src = reader.result
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function useUsers() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData: getInitData() }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) setUsers(data.users)
        else setError('Не удалось загрузить список')
      })
      .catch(() => setError('Не удалось загрузить список'))
  }, [])

  return { users, error }
}

function ClientsTab() {
  const { users, error } = useUsers()

  if (error) return <p className="admin-error">{error}</p>
  if (!users) return <p className="admin-loading">Загрузка…</p>
  if (users.length === 0) return <p className="admin-loading">Пока никто не писал боту</p>

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            <th>Ник</th>
            <th>Архетип</th>
            <th>Дата</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.chat_id}>
              <td>{u.username ? `@${u.username}` : u.first_name || u.chat_id}</td>
              <td>{u.archetype || '—'}</td>
              <td>
                {u.archetype_at
                  ? new Date(u.archetype_at).toLocaleDateString('ru-RU')
                  : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RecipientPicker({ mode, setMode, selectedIds, setSelectedIds }) {
  const { users, error } = useUsers()

  function toggle(chatId) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(chatId)) next.delete(chatId)
      else next.add(chatId)
      return next
    })
  }

  return (
    <>
      <label className="admin-label">Получатели</label>
      <div className="recipient-toggle">
        <button
          className={`admin-tab ${mode === 'all' ? 'active' : ''}`}
          onClick={() => setMode('all')}
          type="button"
        >
          Все
        </button>
        <button
          className={`admin-tab ${mode === 'selected' ? 'active' : ''}`}
          onClick={() => setMode('selected')}
          type="button"
        >
          Выбрать
        </button>
      </div>

      {mode === 'selected' && (
        <div className="recipient-list">
          {error && <p className="admin-error">{error}</p>}
          {!users && !error && <p className="admin-loading">Загрузка…</p>}
          {users?.map((u) => (
            <label key={u.chat_id} className="recipient-row">
              <input
                type="checkbox"
                checked={selectedIds.has(u.chat_id)}
                onChange={() => toggle(u.chat_id)}
              />
              <span>
                {u.username ? `@${u.username}` : u.first_name || u.chat_id}
                {u.archetype ? ` — ${u.archetype}` : ''}
              </span>
            </label>
          ))}
        </div>
      )}
    </>
  )
}

function BroadcastTab() {
  const [photoPreview, setPhotoPreview] = useState(null)
  const [compressing, setCompressing] = useState(false)
  const [caption, setCaption] = useState('')
  const [buttonText, setButtonText] = useState('')
  const [buttonUrl, setButtonUrl] = useState('')
  const [recipientMode, setRecipientMode] = useState('all')
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)
  const textareaRef = useRef(null)

  function wrapSelection(marker) {
    const el = textareaRef.current
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = caption.slice(start, end)
    const next = caption.slice(0, start) + marker + selected + marker + caption.slice(end)
    setCaption(next)
    requestAnimationFrame(() => {
      el.focus()
      el.selectionStart = start + marker.length
      el.selectionEnd = start + marker.length + selected.length
    })
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCompressing(true)
    try {
      const compressed = await compressImage(file)
      setPhotoPreview(compressed)
    } catch {
      setResult('Не удалось обработать фото, попробуй другое')
    } finally {
      setCompressing(false)
    }
  }

  const hasContent = Boolean(photoPreview) || caption.trim().length > 0
  const hasRecipients = recipientMode === 'all' || selectedIds.size > 0
  const canSend = hasContent && hasRecipients && !sending && !compressing

  async function handleSend() {
    if (!canSend) return
    const confirmed = window.confirm('Отправить рассылку?')
    if (!confirmed) return

    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: getInitData(),
          photoBase64: photoPreview || undefined,
          caption,
          buttonText,
          buttonUrl,
          chatIds: recipientMode === 'selected' ? Array.from(selectedIds) : undefined,
        }),
      })
      const data = await res.json()
      if (data.ok) {
        setResult(`Доставлено: ${data.sent}, ошибка: ${data.failed}`)
      } else {
        setResult('Не удалось отправить рассылку')
      }
    } catch {
      setResult('Не удалось отправить рассылку')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="broadcast-form">
      <label className="admin-label">Фото (необязательно)</label>
      <input type="file" accept="image/*" onChange={handleFile} />
      {compressing && <p className="admin-loading">Обрабатываем фото…</p>}
      {photoPreview && <img src={photoPreview} alt="" className="broadcast-preview" />}

      <label className="admin-label">Текст</label>
      <div className="format-toolbar">
        <button type="button" onClick={() => wrapSelection('**')} className="format-btn">
          <b>Ж</b>
        </button>
        <button type="button" onClick={() => wrapSelection('_')} className="format-btn">
          <i>К</i>
        </button>
      </div>
      <textarea
        ref={textareaRef}
        className="admin-textarea"
        rows={5}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Текст сообщения"
      />
      <p className="format-hint">Выдели текст и нажми Ж или К — либо пиши сам: **жирный**, _курсив_</p>

      <label className="admin-label">Кнопка (необязательно)</label>
      <input
        className="admin-input"
        value={buttonText}
        onChange={(e) => setButtonText(e.target.value)}
        placeholder="Текст кнопки"
      />
      <input
        className="admin-input"
        value={buttonUrl}
        onChange={(e) => setButtonUrl(e.target.value)}
        placeholder="Ссылка (https://...)"
      />

      <RecipientPicker
        mode={recipientMode}
        setMode={setRecipientMode}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
      />

      <button className="admin-send-btn" onClick={handleSend} disabled={!canSend}>
        {sending ? 'Отправляем…' : 'Отправить'}
      </button>

      {result && <p className="admin-result">{result}</p>}
    </div>
  )
}

export default function AdminPanel({ onClose }) {
  const [tab, setTab] = useState('clients')

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1 className="admin-title">Админка</h1>
        <button className="admin-close" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>
      </div>

      <div className="admin-tabs">
        <button
          className={`admin-tab ${tab === 'clients' ? 'active' : ''}`}
          onClick={() => setTab('clients')}
        >
          Клиенты
        </button>
        <button
          className={`admin-tab ${tab === 'broadcast' ? 'active' : ''}`}
          onClick={() => setTab('broadcast')}
        >
          Рассылка
        </button>
      </div>

      <div className="admin-content">
        {tab === 'clients' ? <ClientsTab /> : <BroadcastTab />}
      </div>
    </div>
  )
}

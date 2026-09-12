import { useState, useEffect } from 'react'

function getInitData() {
  return window.Telegram?.WebApp?.initData
}

function ClientsTab() {
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

function BroadcastTab() {
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [buttonText, setButtonText] = useState('')
  const [buttonUrl, setButtonUrl] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  async function handleSend() {
    if (!photoPreview) return
    const confirmed = window.confirm('Отправить рассылку всем пользователям?')
    if (!confirmed) return

    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData: getInitData(),
          photoBase64: photoPreview,
          caption,
          buttonText,
          buttonUrl,
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
      <label className="admin-label">Фото</label>
      <input type="file" accept="image/*" onChange={handleFile} />
      {photoPreview && <img src={photoPreview} alt="" className="broadcast-preview" />}

      <label className="admin-label">Текст</label>
      <textarea
        className="admin-textarea"
        rows={5}
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Текст сообщения"
      />

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

      <button
        className="admin-send-btn"
        onClick={handleSend}
        disabled={!photoPreview || sending}
      >
        {sending ? 'Отправляем…' : 'Отправить всем'}
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

// Ежедневный пинг Supabase, чтобы бесплатный проект не уходил на паузу
// из-за неактивности. Запускается Vercel Cron (см. vercel.json).
// Если в Vercel задан CRON_SECRET, Vercel сам передаёт его в заголовке
// Authorization — посторонние вызовы отклоняются.

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) {
    res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_KEY not set' })
    return
  }

  try {
    const response = await fetch(`${url}/rest/v1/users?select=chat_id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    })
    if (!response.ok) {
      const text = await response.text()
      console.error('Supabase keepalive failed:', response.status, text)
      res.status(502).json({ ok: false, status: response.status })
      return
    }
    res.status(200).json({ ok: true, at: new Date().toISOString() })
  } catch (e) {
    console.error('Supabase keepalive error:', e)
    res.status(500).json({ ok: false, error: String(e) })
  }
}

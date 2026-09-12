// POST /api/admin/users
// Тело: { initData }
// Ответ: { ok: true, users: [{ chat_id, username, first_name, archetype, archetype_at, created_at }] }

import { requireAdmin } from '../_lib/telegram.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false })
    return
  }

  const admin = requireAdmin(req)
  if (!admin) {
    res.status(403).json({ ok: false, error: 'forbidden' })
    return
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/users?select=chat_id,username,first_name,archetype,archetype_at,created_at&order=created_at.desc`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    )

    if (!response.ok) {
      console.error('Supabase error:', await response.text())
      res.status(500).json({ ok: false })
      return
    }

    const users = await response.json()
    res.status(200).json({ ok: true, users })
  } catch (err) {
    console.error('Ошибка получения списка пользователей:', err)
    res.status(500).json({ ok: false })
  }
}

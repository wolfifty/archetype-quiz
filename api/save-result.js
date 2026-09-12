// Serverless-функция на Vercel: /api/save-result
// Mini App вызывает её, когда пользователь дошёл до результата теста.
// Проверяет подпись initData от Telegram (чтобы нельзя было подделать чужой результат)
// и сохраняет archetype в Supabase.

import crypto from 'node:crypto'

function validateTelegramInitData(initData, botToken) {
  if (!initData) return null
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return null
  params.delete('hash')

  const pairs = []
  for (const [key, value] of params.entries()) {
    pairs.push(`${key}=${value}`)
  }
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const computedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')

  if (computedHash !== hash) return null

  const userJson = params.get('user')
  if (!userJson) return null
  try {
    return JSON.parse(userJson)
  } catch {
    return null
  }
}

const ALLOWED_ARCHETYPES = ['star', 'expert', 'blogger', 'eminence']

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false })
    return
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  if (!botToken || !supabaseUrl || !supabaseKey) {
    console.error('Не заданы TELEGRAM_BOT_TOKEN / SUPABASE_URL / SUPABASE_SERVICE_KEY')
    res.status(500).json({ ok: false })
    return
  }

  const { initData, archetype } = req.body || {}

  if (!ALLOWED_ARCHETYPES.includes(archetype)) {
    res.status(400).json({ ok: false, error: 'invalid archetype' })
    return
  }

  const user = validateTelegramInitData(initData, botToken)
  if (!user?.id) {
    res.status(401).json({ ok: false, error: 'invalid init data' })
    return
  }

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=chat_id`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([
        {
          chat_id: user.id,
          username: user.username || null,
          first_name: user.first_name || null,
          archetype,
          archetype_at: new Date().toISOString(),
        },
      ]),
    })

    if (!response.ok) {
      console.error('Supabase error:', await response.text())
      res.status(500).json({ ok: false })
      return
    }

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('Ошибка сохранения результата:', err)
    res.status(500).json({ ok: false })
  }
}

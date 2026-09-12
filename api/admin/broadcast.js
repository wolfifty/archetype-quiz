// POST /api/admin/broadcast
// Тело: { initData, photoBase64 (data:image/...;base64,...), caption, buttonText?, buttonUrl? }
// Ответ: { ok: true, sent, failed }

import { requireAdmin } from '../_lib/telegram.js'

function decodeDataUrl(dataUrl) {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl || '')
  if (!match) return null
  const mime = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  const ext = mime.split('/')[1] || 'jpg'
  return { buffer, mime, filename: `broadcast.${ext}` }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

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

  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY

  const { photoBase64, caption, buttonText, buttonUrl } = req.body || {}

  const photo = decodeDataUrl(photoBase64)
  if (!photo) {
    res.status(400).json({ ok: false, error: 'no photo' })
    return
  }

  // Забираем всех пользователей
  let users = []
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/users?select=chat_id`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
      },
    })
    users = await response.json()
  } catch (err) {
    console.error('Ошибка получения пользователей для рассылки:', err)
    res.status(500).json({ ok: false })
    return
  }

  const replyMarkup =
    buttonText && buttonUrl
      ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] }
      : undefined

  let sent = 0
  let failed = 0

  for (const user of users) {
    try {
      const form = new FormData()
      form.append('chat_id', String(user.chat_id))
      if (caption) form.append('caption', caption)
      if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup))
      form.append('photo', new Blob([photo.buffer], { type: photo.mime }), photo.filename)

      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
        method: 'POST',
        body: form,
      })
      const tgJson = await tgRes.json()

      if (tgJson.ok) {
        sent += 1
      } else {
        failed += 1
      }
    } catch (err) {
      failed += 1
    }

    await sleep(50) // не разгоняемся быстрее ~20 сообщений в секунду
  }

  res.status(200).json({ ok: true, sent, failed, total: users.length })
}

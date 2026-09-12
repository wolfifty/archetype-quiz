// POST /api/admin/broadcast
// Тело: { initData, photoBase64?, caption?, buttonText?, buttonUrl?, chatIds? }
//   - photoBase64 и caption необязательны, но нужен хотя бы один из них
//   - buttonText/buttonUrl необязательны (нужны оба вместе, иначе кнопка не добавляется)
//   - chatIds — необязательный массив chat_id; если не передан, шлём всем из БД
// Ответ: { ok: true, sent, failed, total }

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

async function sendToUser(botToken, chatId, { photo, caption, replyMarkup }) {
  if (photo) {
    const form = new FormData()
    form.append('chat_id', String(chatId))
    if (caption) form.append('caption', caption)
    if (replyMarkup) form.append('reply_markup', JSON.stringify(replyMarkup))
    form.append('photo', new Blob([photo.buffer], { type: photo.mime }), photo.filename)

    const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: 'POST',
      body: form,
    })
    const tgJson = await tgRes.json()
    return tgJson.ok
  }

  const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: caption,
      reply_markup: replyMarkup,
    }),
  })
  const tgJson = await tgRes.json()
  return tgJson.ok
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

  const { photoBase64, caption, buttonText, buttonUrl, chatIds } = req.body || {}

  const photo = photoBase64 ? decodeDataUrl(photoBase64) : null
  const trimmedCaption = (caption || '').trim()

  if (!photo && !trimmedCaption) {
    res.status(400).json({ ok: false, error: 'nothing to send' })
    return
  }

  const replyMarkup =
    buttonText && buttonUrl
      ? { inline_keyboard: [[{ text: buttonText, url: buttonUrl }]] }
      : undefined

  // Получатели: либо переданный список, либо все из БД
  let targetIds = Array.isArray(chatIds) && chatIds.length > 0 ? chatIds : null

  if (!targetIds) {
    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/users?select=chat_id`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      })
      const users = await response.json()
      targetIds = users.map((u) => u.chat_id)
    } catch (err) {
      console.error('Ошибка получения пользователей для рассылки:', err)
      res.status(500).json({ ok: false })
      return
    }
  }

  let sent = 0
  let failed = 0

  for (const chatId of targetIds) {
    try {
      const ok = await sendToUser(botToken, chatId, {
        photo,
        caption: trimmedCaption || undefined,
        replyMarkup,
      })
      if (ok) sent += 1
      else failed += 1
    } catch {
      failed += 1
    }
    await sleep(50)
  }

  res.status(200).json({ ok: true, sent, failed, total: targetIds.length })
}

// POST /api/followup
// Вызывается НЕ пользователем и НЕ Telegram, а сервисом QStash — спустя заданную
// задержку после /start. Присылает второе сообщение про лид-магнит с кнопкой.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).send('ok')
    return
  }

  // Простая защита: пускаем только запросы с правильным секретом
  // (его QStash передаёт из заголовка Upstash-Forward-x-followup-secret)
  const secret = process.env.FOLLOWUP_SECRET
  if (secret && req.headers['x-followup-secret'] !== secret) {
    res.status(403).send('forbidden')
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const { chatId } = req.body || {}

  if (!token || !chatId) {
    res.status(200).send('ok')
    return
  }

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        document: `${process.env.SITE_URL}/files/40-idey-progrev.pdf`,
        caption:
          'кстати, я подготовила файл — «40 готовых сценариев рилс, которые можно снять уже сегодня». забирай ниже⬇️',
      }),
    })
  } catch (err) {
    console.error('Ошибка отправки follow-up:', err)
  }

  res.status(200).send('ok')
}

// Serverless-функция на Vercel: /api/webhook
// Принимает обновления от Telegram (через setWebhook): сообщения и нажатия на inline-кнопки.
//
// Переменные окружения (Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN     — токен бота от @BotFather
//   SITE_URL               — https://archetype-quiz-omega.vercel.app (без слэша на конце)
//   SUPABASE_URL           — адрес проекта Supabase
//   SUPABASE_SERVICE_KEY   — service_role ключ Supabase
//   QSTASH_TOKEN           — токен Upstash QStash (для отложенного сообщения через 10 мин)
//   FOLLOWUP_SECRET        — любая произвольная строка-пароль, защищает /api/followup от чужих вызовов
//   FOLLOWUP_DELAY         — необязательно, по умолчанию "10m" (можно поставить "1m" для теста)

const START_TEXT = `стоп! прежде чем говорить о деньгах, узнай, кто ты❤️‍🔥

у большинства людей нет проблем с контентом, у них проблема в том, что они играют не свою роль.

4 архетипа. 5 вопросов. 2 минуты. жми, и разберемся, через что ты продаешь — звездность, статус, мозг или жизнь?`

async function saveUser({ chatId, username, firstName }) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return

  try {
    await fetch(`${supabaseUrl}/rest/v1/users?on_conflict=chat_id`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify([
        { chat_id: chatId, username: username || null, first_name: firstName || null },
      ]),
    })
  } catch (err) {
    console.error('Ошибка сохранения пользователя:', err)
  }
}

// Ставим в очередь QStash отправку follow-up-сообщения через N минут
async function scheduleFollowup(chatId) {
  const qstashToken = process.env.QSTASH_TOKEN
  const siteUrl = process.env.SITE_URL
  const secret = process.env.FOLLOWUP_SECRET
  const delay = process.env.FOLLOWUP_DELAY || '10m'

  if (!qstashToken || !siteUrl) {
    console.error('Не задан QSTASH_TOKEN или SITE_URL — follow-up не запланирован')
    return
  }

  try {
    await fetch(`https://qstash.upstash.io/v2/publish/${siteUrl}/api/followup`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${qstashToken}`,
        'Content-Type': 'application/json',
        'Upstash-Delay': delay,
        'Upstash-Forward-x-followup-secret': secret || '',
      },
      body: JSON.stringify({ chatId }),
    })
  } catch (err) {
    console.error('Ошибка планирования follow-up:', err)
  }
}

async function handleStart(message, token, siteUrl) {
  const chatId = message.chat.id

  await saveUser({
    chatId,
    username: message.from?.username,
    firstName: message.from?.first_name,
  })

  await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      photo: `${siteUrl}/images/bg.png`,
      caption: START_TEXT,
      reply_markup: {
        inline_keyboard: [[{ text: 'Пройти тест', web_app: { url: siteUrl } }]],
      },
    }),
  })

  await scheduleFollowup(chatId)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(200).send('ok')
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const siteUrl = process.env.SITE_URL

  if (!token || !siteUrl) {
    console.error('Не заданы TELEGRAM_BOT_TOKEN или SITE_URL')
    res.status(200).send('ok')
    return
  }

  const update = req.body

  try {
    if (update?.message?.text === '/start') {
      await handleStart(update.message, token, siteUrl)
    }
  } catch (err) {
    console.error('Ошибка обработки апдейта:', err)
  }

  res.status(200).send('ok')
}

// Serverless-функция на Vercel: /api/webhook
// Принимает обновления от Telegram (через setWebhook) и отвечает на /start.
//
// Обязательные переменные окружения (задаются в Vercel → Settings → Environment Variables):
//   TELEGRAM_BOT_TOKEN     — токен бота от @BotFather
//   SITE_URL               — публичный адрес этого же сайта, например https://archetype-quiz-omega.vercel.app
//                            (без слэша на конце)
//   SUPABASE_URL           — адрес проекта Supabase, например https://xxxxx.supabase.co
//   SUPABASE_SERVICE_KEY   — service_role ключ из Supabase (Settings → API)

const START_TEXT = `стоп! прежде чем говорить о деньгах, узнай, кто ты❤️‍🔥

у большинства людей нет проблем с контентом, у них проблема в том, что они играют не свою роль.

4 архетипа. 5 вопросов. 2 минуты. жми, и разберемся, через что ты продаешь — звездность, статус, мозг или жизнь?`

async function saveUser({ chatId, username, firstName }) {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY
  if (!supabaseUrl || !supabaseKey) return // БД ещё не подключена — просто пропускаем

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
        {
          chat_id: chatId,
          username: username || null,
          first_name: firstName || null,
        },
      ]),
    })
  } catch (err) {
    console.error('Ошибка сохранения пользователя:', err)
  }
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
    res.status(200).send('ok') // Telegram всё равно ждёт 200, иначе будет долбить повторами
    return
  }

  const update = req.body
  const message = update?.message

  try {
    if (message?.text === '/start') {
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
            inline_keyboard: [
              [
                {
                  text: 'Пройти тест',
                  web_app: { url: siteUrl },
                },
              ],
            ],
          },
        }),
      })
    }
  } catch (err) {
    console.error('Ошибка обработки апдейта:', err)
  }

  res.status(200).send('ok')
}
